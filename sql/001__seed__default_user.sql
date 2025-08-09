-- Seeding: 001__seed__default_user.sql

BEGIN;

INSERT INTO users (id, username, email, password_hash)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    'admin@superman.com',
    '$2a$10$rK7PXqYEoaXZ.gGQiPM1xOLGe0sGzFZ7QUdL3aNbGxFZGtLWYqQZi' -- 'admin123' x10
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, username, email, password_hash)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'user',
    'user@superman.com',
    '$2a$10$YmxMGgA9V3ZNqMJ8lxHpkuXY.kC.M8RHQhU4mWDO.YrqFxFzXpQPO' -- user123 x10
) ON CONFLICT (email) DO NOTHING;

COMMIT;