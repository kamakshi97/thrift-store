# thrift-store
Thrift store assignment for cloud computing

StyleHub is an inventory for a thrift store with a light-themed dashboard.
The frontend reads, creates, and edits stylists and inventory through the two backend
services. Set `USER_SERVICE_URL` and `INVENTORY_SERVICE_URL` to their base URLs.
For local development they default to `http://127.0.0.1:8002` and
`http://127.0.0.1:8001`, respectively. Kubernetes sets them to
`http://user-service:8000` and `http://inventory-service:8000`.

For Docker containers on the same network, use the backend container names and
internal ports, such as `http://stylehub-user:8000` and
`http://stylehub-inventory:8000`. Ensure both services and PostgreSQL are
running before using the dashboard.

Select the pencil icon beside a saved stylist or item to expand its edit form, change its fields,
and select **Save stylist** or **Save item**. Changes are stored in the database;
successful saves show a confirmation popup. The backend update endpoints are
`PUT /users/{user_id}` and `PUT /items/{item_id}`. Duplicate stylist emails are
rejected and missing records return HTTP 404.

The stylist **Type** dropdown offers Personal stylist, Celebrity stylist, and
Hair and makeup stylist. These values use the existing `role` API/database field.
Older values are preserved in edit forms until a different type is selected.

After changing the source, restart the local services, or rebuild all three
application images and deploy the updated images to Kubernetes. Restarting pods
alone does not rebuild their images.

## PostgreSQL storage on Kubernetes

The PostgreSQL deployment uses a 1 GiB PersistentVolumeClaim. The cluster needs
a default StorageClass capable of provisioning a ReadWriteOnce volume. The
volume retains data when the PostgreSQL pod is restarted; its lifetime after
deleting the claim or cluster depends on the storage provider and reclaim
policy. A persistent volume is not a substitute for backups.

If PostgreSQL is already running without a volume, back up and restore its data
before applying this change: the new volume starts empty and replacing the old
pod discards its ephemeral database.

Apply the namespace first, then PostgreSQL:

```powershell
kubectl apply -f k8s\namespace.yaml
kubectl apply -f k8s\postgres.yaml
kubectl -n stylehub get pvc postgres-data
kubectl -n stylehub rollout status deployment/postgres --timeout=180s
```

To check persistence on a fresh test database, create a test table, restart the
PostgreSQL deployment, and verify that the row is still present:

```powershell
kubectl -n stylehub exec deployment/postgres -- psql -U postgres -d stylehub -c "CREATE TABLE persistence_check (message text NOT NULL);"
kubectl -n stylehub exec deployment/postgres -- psql -U postgres -d stylehub -c "INSERT INTO persistence_check VALUES ('survived');"
kubectl -n stylehub rollout restart deployment/postgres
kubectl -n stylehub rollout status deployment/postgres --timeout=180s
kubectl -n stylehub exec deployment/postgres -- psql -U postgres -d stylehub -c "SELECT message FROM persistence_check;"
```

The final query should return `survived`. This test creates a table named
`persistence_check`; use a fresh database where that name is not already in use.
