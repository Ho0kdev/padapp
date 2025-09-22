-- Seed SQL para PadApp
-- Este archivo contiene los datos de prueba para la aplicación

-- Limpiar datos existentes (en orden para evitar conflictos de foreign keys)
TRUNCATE TABLE "notifications" CASCADE;
TRUNCATE TABLE "tournament_stats" CASCADE;
TRUNCATE TABLE "match_games" CASCADE;
TRUNCATE TABLE "match_sets" CASCADE;
TRUNCATE TABLE "matches" CASCADE;
TRUNCATE TABLE "zone_teams" CASCADE;
TRUNCATE TABLE "tournament_zones" CASCADE;
TRUNCATE TABLE "team_payments" CASCADE;
TRUNCATE TABLE "teams" CASCADE;
TRUNCATE TABLE "tournament_categories" CASCADE;
TRUNCATE TABLE "tournament_clubs" CASCADE;
TRUNCATE TABLE "tournaments" CASCADE;
TRUNCATE TABLE "player_rankings" CASCADE;
TRUNCATE TABLE "categories" CASCADE;
TRUNCATE TABLE "courts" CASCADE;
TRUNCATE TABLE "clubs" CASCADE;
TRUNCATE TABLE "players" CASCADE;
TRUNCATE TABLE "sessions" CASCADE;
TRUNCATE TABLE "accounts" CASCADE;
TRUNCATE TABLE "users" CASCADE;

-- 1. Crear usuarios
-- Password hash para '123456' con bcrypt (salt rounds 12)
INSERT INTO "users" (id, name, email, password, role, "createdAt", "updatedAt") VALUES
('admin_user_id', 'Administrador Sistema', 'admin@padapp.com', '$2a$12$VYT8hqJGpX8xqXzMNQzDnuxuWJ1yF3sP8A9K5xQqp6YfP2c8NVQGS', 'ADMIN', NOW(), NOW()),
('user_juan_id', 'Juan Pérez', 'juan.perez@email.com', '$2a$12$VYT8hqJGpX8xqXzMNQzDnuxuWJ1yF3sP8A9K5xQqp6YfP2c8NVQGS', 'PLAYER', NOW(), NOW()),
('user_maria_id', 'María García', 'maria.garcia@email.com', '$2a$12$VYT8hqJGpX8xqXzMNQzDnuxuWJ1yF3sP8A9K5xQqp6YfP2c8NVQGS', 'PLAYER', NOW(), NOW()),
('user_carlos_id', 'Carlos López', 'carlos.lopez@email.com', '$2a$12$VYT8hqJGpX8xqXzMNQzDnuxuWJ1yF3sP8A9K5xQqp6YfP2c8NVQGS', 'PLAYER', NOW(), NOW()),
('user_ana_id', 'Ana Martínez', 'ana.martinez@email.com', '$2a$12$VYT8hqJGpX8xqXzMNQzDnuxuWJ1yF3sP8A9K5xQqp6YfP2c8NVQGS', 'PLAYER', NOW(), NOW()),
('user_diego_id', 'Diego Rodríguez', 'diego.rodriguez@email.com', '$2a$12$VYT8hqJGpX8xqXzMNQzDnuxuWJ1yF3sP8A9K5xQqp6YfP2c8NVQGS', 'PLAYER', NOW(), NOW()),
('user_lucia_id', 'Lucía Fernández', 'lucia.fernandez@email.com', '$2a$12$VYT8hqJGpX8xqXzMNQzDnuxuWJ1yF3sP8A9K5xQqp6YfP2c8NVQGS', 'PLAYER', NOW(), NOW());

-- 2. Crear jugadores
INSERT INTO "players" (id, "userId", "firstName", "lastName", phone, "dateOfBirth", gender, "rankingPoints", "createdAt", "updatedAt") VALUES
('admin_player_id', 'admin_user_id', 'Administrador', 'Sistema', NULL, NULL, NULL, 0, NOW(), NOW()),
('player_juan_id', 'user_juan_id', 'Juan', 'Pérez', '+54 9 11 1234-5678', '1990-05-15', 'MALE', 1250, NOW(), NOW()),
('player_maria_id', 'user_maria_id', 'María', 'García', '+54 9 11 2345-6789', '1988-08-22', 'FEMALE', 1180, NOW(), NOW()),
('player_carlos_id', 'user_carlos_id', 'Carlos', 'López', '+54 9 11 3456-7890', '1985-12-10', 'MALE', 1420, NOW(), NOW()),
('player_ana_id', 'user_ana_id', 'Ana', 'Martínez', '+54 9 11 4567-8901', '1992-03-08', 'FEMALE', 980, NOW(), NOW()),
('player_diego_id', 'user_diego_id', 'Diego', 'Rodríguez', '+54 9 11 5678-9012', '1987-11-25', 'MALE', 1320, NOW(), NOW()),
('player_lucia_id', 'user_lucia_id', 'Lucía', 'Fernández', '+54 9 11 6789-0123', '1991-07-14', 'FEMALE', 1150, NOW(), NOW());

-- 3. Crear clubes
INSERT INTO "clubs" (id, name, description, address, city, country, "postalCode", phone, email, "createdAt", "updatedAt") VALUES
('club_norte_id', 'Club Deportivo Norte', 'Club premium con las mejores instalaciones de pádel', 'Av. Libertador 1234', 'Buenos Aires', 'Argentina', '1425', '+54 11 4567-8900', 'info@clubnorte.com', NOW(), NOW()),
('club_racquet_id', 'Racquet Club', 'Club tradicional con ambiente familiar', 'Calle Falsa 456', 'Buenos Aires', 'Argentina', '1414', '+54 11 3456-7890', 'contacto@racquetclub.com', NOW(), NOW()),
('club_sur_id', 'Polideportivo Sur', 'Complejo deportivo público', 'Av. San Juan 789', 'Buenos Aires', 'Argentina', '1147', '+54 11 2345-6789', 'info@polisur.gov.ar', NOW(), NOW());

-- 4. Crear canchas
INSERT INTO "courts" (id, "clubId", name, surface, "hasLighting", "hasRoof", "hourlyRate", "createdAt", "updatedAt") VALUES
-- Club Norte
('court_norte_1', 'club_norte_id', 'Cancha 1', 'CONCRETE', true, false, 3000, NOW(), NOW()),
('court_norte_2', 'club_norte_id', 'Cancha 2', 'ARTIFICIAL_GRASS', true, true, 3500, NOW(), NOW()),
('court_norte_3', 'club_norte_id', 'Cancha 3', 'CONCRETE', true, false, 3000, NOW(), NOW()),
-- Racquet Club
('court_racquet_a', 'club_racquet_id', 'Court A', 'CERAMIC', true, true, 4000, NOW(), NOW()),
('court_racquet_b', 'club_racquet_id', 'Court B', 'CERAMIC', true, true, 4000, NOW(), NOW()),
-- Polideportivo Sur
('court_sur_1', 'club_sur_id', 'Pista 1', 'CONCRETE', false, false, 1500, NOW(), NOW()),
('court_sur_2', 'club_sur_id', 'Pista 2', 'CONCRETE', false, false, 1500, NOW(), NOW()),
('court_sur_3', 'club_sur_id', 'Pista 3', 'ARTIFICIAL_GRASS', true, false, 2000, NOW(), NOW());

-- 5. Crear categorías
INSERT INTO "categories" (id, name, description, type, "minRankingPoints", "maxRankingPoints", "genderRestriction", "minAge", "createdAt") VALUES
('cat_masculino_a', 'Masculino A', 'Categoría masculina nivel avanzado', 'SKILL', 1200, NULL, 'MALE', NULL, NOW()),
('cat_masculino_b', 'Masculino B', 'Categoría masculina nivel intermedio', 'SKILL', 800, 1199, 'MALE', NULL, NOW()),
('cat_femenino_a', 'Femenino A', 'Categoría femenina nivel avanzado', 'SKILL', 1000, NULL, 'FEMALE', NULL, NOW()),
('cat_femenino_b', 'Femenino B', 'Categoría femenina nivel intermedio', 'SKILL', 600, 999, 'FEMALE', NULL, NOW()),
('cat_mixto', 'Mixto', 'Categoría mixta (un hombre y una mujer)', 'MIXED', NULL, NULL, 'MIXED', NULL, NOW()),
('cat_veteranos', 'Veteranos +45', 'Categoría para jugadores mayores de 45 años', 'AGE', NULL, NULL, 'MALE', 45, NOW());

-- 6. Crear rankings para jugadores
INSERT INTO "player_rankings" (id, "playerId", "categoryId", "currentPoints", "seasonYear", "lastUpdated") VALUES
-- Juan Pérez (1250 puntos, MALE)
('rank_juan_a', 'player_juan_id', 'cat_masculino_a', 1250, EXTRACT(YEAR FROM NOW()), NOW()),
('rank_juan_mixto', 'player_juan_id', 'cat_mixto', 1250, EXTRACT(YEAR FROM NOW()), NOW()),
-- María García (1180 puntos, FEMALE)
('rank_maria_a', 'player_maria_id', 'cat_femenino_a', 1180, EXTRACT(YEAR FROM NOW()), NOW()),
('rank_maria_mixto', 'player_maria_id', 'cat_mixto', 1180, EXTRACT(YEAR FROM NOW()), NOW()),
-- Carlos López (1420 puntos, MALE)
('rank_carlos_a', 'player_carlos_id', 'cat_masculino_a', 1420, EXTRACT(YEAR FROM NOW()), NOW()),
('rank_carlos_mixto', 'player_carlos_id', 'cat_mixto', 1420, EXTRACT(YEAR FROM NOW()), NOW()),
-- Ana Martínez (980 puntos, FEMALE)
('rank_ana_b', 'player_ana_id', 'cat_femenino_b', 980, EXTRACT(YEAR FROM NOW()), NOW()),
('rank_ana_mixto', 'player_ana_id', 'cat_mixto', 980, EXTRACT(YEAR FROM NOW()), NOW()),
-- Diego Rodríguez (1320 puntos, MALE)
('rank_diego_a', 'player_diego_id', 'cat_masculino_a', 1320, EXTRACT(YEAR FROM NOW()), NOW()),
('rank_diego_mixto', 'player_diego_id', 'cat_mixto', 1320, EXTRACT(YEAR FROM NOW()), NOW()),
-- Lucía Fernández (1150 puntos, FEMALE)
('rank_lucia_a', 'player_lucia_id', 'cat_femenino_a', 1150, EXTRACT(YEAR FROM NOW()), NOW()),
('rank_lucia_mixto', 'player_lucia_id', 'cat_mixto', 1150, EXTRACT(YEAR FROM NOW()), NOW());

-- 7. Crear torneo de ejemplo
INSERT INTO "tournaments" (
    id, name, description, type, status,
    "registrationStart", "registrationEnd", "tournamentStart", "tournamentEnd",
    "maxParticipants", "minParticipants", "registrationFee", "prizePool",
    "setsToWin", "gamesToWinSet", "tiebreakAt", "goldenPoint",
    "organizerId", "mainClubId",
    "createdAt", "updatedAt"
) VALUES (
    'tournament_primavera',
    'Torneo de Primavera 2024',
    'Torneo oficial de inicio de temporada con múltiples categorías',
    'SINGLE_ELIMINATION',
    'REGISTRATION_OPEN',
    NOW(),
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '16 days',
    64,
    4,
    2500,
    50000,
    2,
    6,
    6,
    true,
    'admin_user_id',
    'club_norte_id',
    NOW(),
    NOW()
);

-- 8. Crear categorías del torneo
INSERT INTO "tournament_categories" (id, "tournamentId", "categoryId", "maxTeams", "registrationFee", "prizePool") VALUES
('tc_masculino_a', 'tournament_primavera', 'cat_masculino_a', 16, 2500, 20000),
('tc_masculino_b', 'tournament_primavera', 'cat_masculino_b', 16, 2000, 15000),
('tc_femenino_a', 'tournament_primavera', 'cat_femenino_a', 16, 2500, 15000);

-- 9. Crear clubes del torneo
INSERT INTO "tournament_clubs" ("tournamentId", "clubId") VALUES
('tournament_primavera', 'club_norte_id'),
('tournament_primavera', 'club_racquet_id');

-- 10. Crear equipos de ejemplo
INSERT INTO "teams" (
    id, "tournamentId", "categoryId", name,
    "player1Id", "player2Id", "registrationStatus", "registeredAt"
) VALUES
('team_ases', 'tournament_primavera', 'cat_masculino_a', 'Los Ases', 'player_juan_id', 'player_carlos_id', 'PAID', NOW()),
('team_smash', 'tournament_primavera', 'cat_masculino_a', 'Smash Brothers', 'player_diego_id', 'player_juan_id', 'CONFIRMED', NOW()),
('team_power', 'tournament_primavera', 'cat_femenino_a', 'Power Girls', 'player_maria_id', 'player_lucia_id', 'PAID', NOW());

-- 11. Crear pagos de equipos
INSERT INTO "team_payments" (id, "teamId", amount, "paymentStatus", "paymentMethod", "paidAt", "createdAt") VALUES
('payment_ases', 'team_ases', 2500, 'PAID', 'tarjeta', NOW(), NOW()),
('payment_power', 'team_power', 2500, 'PAID', 'efectivo', NOW(), NOW());

-- 12. Crear notificaciones de ejemplo
INSERT INTO "notifications" (
    id, "userId", "tournamentId", type, title, message, status, "sentAt", "createdAt"
) VALUES
('notif_1', 'user_juan_id', 'tournament_primavera', 'REGISTRATION_CONFIRMED', 'Inscripción confirmada', 'Tu equipo ha sido inscrito exitosamente en el Torneo de Primavera 2024', 'SENT', NOW(), NOW()),
('notif_2', 'user_maria_id', NULL, 'TOURNAMENT_UPDATE', 'Nuevo torneo disponible', 'Se ha abierto la inscripción para el Torneo de Primavera 2024', 'PENDING', NULL, NOW());

-- Resultado del seed
SELECT 'Seed SQL ejecutado exitosamente!' as mensaje;
SELECT
    'Usuarios creados: ' || COUNT(*) as resumen
FROM "users"
UNION ALL
SELECT
    'Jugadores creados: ' || COUNT(*)
FROM "players"
UNION ALL
SELECT
    'Clubes creados: ' || COUNT(*)
FROM "clubs"
UNION ALL
SELECT
    'Canchas creadas: ' || COUNT(*)
FROM "courts"
UNION ALL
SELECT
    'Categorías creadas: ' || COUNT(*)
FROM "categories"
UNION ALL
SELECT
    'Torneos creados: ' || COUNT(*)
FROM "tournaments"
UNION ALL
SELECT
    'Equipos creados: ' || COUNT(*)
FROM "teams";

-- Credenciales de prueba
SELECT
    '=== CREDENCIALES DE PRUEBA ===' as info
UNION ALL
SELECT
    'Admin: admin@padapp.com / 123456'
UNION ALL
SELECT
    'Jugador: juan.perez@email.com / 123456'
UNION ALL
SELECT
    'Jugador: maria.garcia@email.com / 123456'
UNION ALL
SELECT
    '(Todos los usuarios tienen contraseña: 123456)';