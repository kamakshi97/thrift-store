import os
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/stylehub")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ItemDB(Base):
    __tablename__ = "items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    color = Column(String, nullable=False)
    stock = Column(Integer, default=0)

Base.metadata.create_all(bind=engine)

app = FastAPI(title="StyleHub Inventory Service", version="1.0")

class ItemCreate(BaseModel):
    name: str
    category: str
    color: str
    stock: int = 0

class ItemResponse(ItemCreate):
    id: int
    class Config:
        from_attributes = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/items", response_model=ItemResponse)
def create_item(item: ItemCreate, db: Session = Depends(get_db)):
    db_item = ItemDB(name=item.name, category=item.category, color=item.color, stock=item.stock)
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.get("/items", response_model=list[ItemResponse])
def list_items(db: Session = Depends(get_db)):
    return db.query(ItemDB).all()

@app.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db)):
    db_item = db.query(ItemDB).filter(ItemDB.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return {"message": "Item deleted successfully"}
