process.env.NODE_ENV = "test";
process.env.DATABASE_URL ||= "postgresql://test:test@localhost:5432/foreman_test";
process.env.BETTER_AUTH_URL ||= "http://localhost:3001";
process.env.CORS_ORIGIN ||= "http://localhost:5173";
process.env.BETTER_AUTH_SECRET ||= "test_secret_value_with_at_least_32_chars";
process.env.JWT_SECRET ||= "test_jwt_secret_value_with_at_least_32_chars";
process.env.TZ ||= "UTC";
