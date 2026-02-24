-- Allow role 2 (investor) in users.role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (2, 3, 4, 5, 6, 7, 8));
