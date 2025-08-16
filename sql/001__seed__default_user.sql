-- Seeding: 001__seed__default_user.sql

BEGIN;

INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    'admin',
    'admin@superman.com',
    '$2b$10$ThtO27Y9o1di6wBB7WLf/u.2zvRMs.kr9QxXry9t3alWjOE/thlqe', -- 'admin123' x10
    'admin'
) ON CONFLICT (email) DO NOTHING;

INSERT INTO users (id, username, email, password_hash, role)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
    'user',
    'user@superman.com',
    '$2b$10$DB/zVFa87Fn60xIwfhYQy.kdHwjgS0BGZ6UIHiGNBKRayLM8UAz1u', -- user123 x10
    'user'
) ON CONFLICT (email) DO NOTHING;

COMMIT;