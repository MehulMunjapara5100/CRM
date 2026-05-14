# Inventory Management System API

Scalable Express.js backend for inventory, product, user, and order management with Prisma, JWT authentication, bcrypt password hashing, RBAC, Zod validation, Multer uploads, and Cloudinary image storage. The local setup uses SQLite so it runs without installing MySQL.

## Features

- User registration and login with hashed passwords.
- JWT authentication with protected routes.
- Role-based access control for `ADMIN`, `STAFF`, and `CLIENT`.
- Admin user CRUD.
- Product CRUD with title, description, price, stock, active status, and multiple images.
- Product images uploaded to Cloudinary through Multer memory uploads.
- Inventory stock-in and stock adjustment endpoints.
- Order creation that automatically decrements stock.
- Negative stock prevention through transactional guarded updates.
- Inventory audit logs.
- Admin dashboard summary.
- Centralized validation, error handling, rate limiting, CORS, Helmet, and compression.

## Roles

| Role | Permissions |
| --- | --- |
| `ADMIN` | Manage users, manage products, update inventory, create/view orders, view dashboard |
| `STAFF` | Update inventory, create/view orders, view inventory logs |
| `CLIENT` | View products, place orders, view own orders |

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```bash
cp .env.example .env
```

3. Configure MySQL and Cloudinary in `.env`.

4. Generate Prisma client and create the local SQLite database:

```bash
npm run prisma:generate
npm run db:local:init
```

5. Seed the default admin:

```bash
npm run seed
```

Default seeded admin:

```text
email: admin@example.com
password: Admin@12345
```

6. Start the API and frontend:

```bash
npm run dev
```

The API runs at `http://localhost:5000/api/v1` by default.

## Environment

```env
NODE_ENV=development
PORT=5000
DATABASE_URL="file:./dev.db"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN="1d"
BCRYPT_SALT_ROUNDS=12
CORS_ORIGIN="http://localhost:3000"
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
CLOUDINARY_FOLDER="inventory-products"
```

`JWT_SECRET` must be at least 32 characters.

## Main Endpoints

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`

### Users

Admin only:

- `GET /api/v1/users`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `DELETE /api/v1/users/:id`

### Products

- `GET /api/v1/products`
- `GET /api/v1/products/:id`

Admin only:

- `POST /api/v1/products`
- `PATCH /api/v1/products/:id`
- `DELETE /api/v1/products/:id`

Use `multipart/form-data` for product create/update. Send images with field name `images`.

Example product fields:

```text
title=Wireless Mouse
description=Ergonomic wireless mouse
price=29.99
stock=100
images=<file>
images=<file>
```

### Inventory

Admin or staff:

- `POST /api/v1/products/:id/stock-in`
- `PATCH /api/v1/products/:id/stock`
- `GET /api/v1/products/:id/inventory-logs`

Stock-in body:

```json
{
  "quantity": 25,
  "note": "Supplier delivery"
}
```

Stock adjustment body:

```json
{
  "stock": 80,
  "note": "Cycle count correction"
}
```

### Orders

Authenticated users:

- `GET /api/v1/orders`
- `POST /api/v1/orders`
- `GET /api/v1/orders/:id`

Create order body:

```json
{
  "items": [
    { "productId": 1, "quantity": 2 },
    { "productId": 2, "quantity": 1 }
  ]
}
```

When an order is created, stock is decremented inside a database transaction. If any product has insufficient stock, the order fails and no stock is changed.

### Dashboard

Admin only:

- `GET /api/v1/dashboard`

## Production Notes

- For production, switch Prisma to your production database provider, use a managed database with backups enabled, and run reviewed migrations.
- Set a long random `JWT_SECRET`.
- Restrict `CORS_ORIGIN` to trusted frontend origins.
- Configure Cloudinary credentials before uploading product images.
- Run `npm run db:local:init` for the local SQLite database.
- Use reviewed Prisma migrations for production deployments.
- Put the API behind HTTPS and a process manager such as PM2, Docker, or your platform runtime.
