-- Forcefully overrides the password of your account back to 'password123'
UPDATE auth.users
SET encrypted_password = crypt('password123', gen_salt('bf'))
WHERE email = 'brightonkato317@gmail.com';
