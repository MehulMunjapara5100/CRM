# Frontend App

This is now a functional frontend for the Inventory Management System.

Run the backend:

```bash
npm run dev
```

Open:

```text
http://localhost:5000
```

Login with the seeded admin account after running local migrations and seed:

```text
email: admin@example.com
password: Admin@12345
```

Functional screens:

- Login and client registration
- Admin dashboard
- Product listing
- Product creation
- Product image upload through the backend Cloudinary integration
- Inventory stock-in for Admin and Staff
- Order creation
- Order listing
- Admin user creation and listing

Cloudinary image uploads require these values in `.env`:

```env
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

If those are empty, create products without selecting image files.

Local database setup:

```bash
npm run prisma:generate
npm run db:local:init
npm run seed
npm run dev
```
