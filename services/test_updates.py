import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError


def load_service(name):
    path = Path(__file__).parent / name / "main.py"
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    with patch.dict(os.environ, {"DATABASE_URL": "sqlite://"}):
        spec.loader.exec_module(module)
    return module


class UpdateTests(unittest.TestCase):
    def test_user_update_persists_and_rejects_duplicate_email(self):
        service = load_service("user-service")
        self.addCleanup(service.engine.dispose)
        with service.SessionLocal() as db:
            user = service.create_user(service.UserCreate(
                email="first@example.com", full_name="First", role="Member"
            ), db)
            other = service.create_user(service.UserCreate(
                email="other@example.com", full_name="Other"
            ), db)
            user_id = user.id
            updated = service.update_user(user_id, service.UserCreate(
                email="updated@example.com", full_name="Updated", role="Manager"
            ), db)
            self.assertEqual(updated.id, user_id)
            db.expire_all()
            saved = db.get(service.UserDB, user_id)
            self.assertEqual(
                (saved.email, saved.full_name, saved.role),
                ("updated@example.com", "Updated", "Manager")
            )
            with self.assertRaises(HTTPException) as duplicate:
                service.update_user(user_id, service.UserCreate(
                    email=other.email, full_name="Rejected"
                ), db)
            self.assertEqual(duplicate.exception.status_code, 400)
            db.expire_all()
            self.assertEqual(db.get(service.UserDB, user_id).email, "updated@example.com")
            with self.assertRaises(HTTPException) as missing:
                service.update_user(999, service.UserCreate(
                    email="missing@example.com", full_name="Missing"
                ), db)
            self.assertEqual(missing.exception.status_code, 404)
            with patch.object(db, "commit", side_effect=IntegrityError("", {}, Exception())):
                with self.assertRaises(HTTPException) as conflict:
                    service.update_user(user_id, service.UserCreate(
                        email="conflict@example.com", full_name="Rejected"
                    ), db)
            self.assertEqual(conflict.exception.status_code, 400)
            self.assertEqual(db.get(service.UserDB, user_id).email, "updated@example.com")

    def test_item_update_persists_all_fields_and_zero_stock(self):
        service = load_service("inventory-service")
        self.addCleanup(service.engine.dispose)
        with service.SessionLocal() as db:
            item = service.create_item(service.ItemCreate(
                name="Jacket", category="Coats", color="Blue", stock=7
            ), db)
            item_id = item.id
            updated = service.update_item(item_id, service.ItemCreate(
                name="Dress", category="Dresses", color="Green", stock=0
            ), db)
            self.assertEqual(updated.id, item_id)
            db.expire_all()
            saved = db.get(service.ItemDB, item_id)
            self.assertEqual(
                (saved.name, saved.category, saved.color, saved.stock),
                ("Dress", "Dresses", "Green", 0)
            )
            with self.assertRaises(HTTPException) as missing:
                service.update_item(999, service.ItemCreate(
                    name="Missing", category="Coats", color="Blue"
                ), db)
            self.assertEqual(missing.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
