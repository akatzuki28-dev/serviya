ALTER TABLE "orders" ADD COLUMN "payment_provider" varchar(20);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gateway_preference_id" varchar(255);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gateway_payment_id" varchar(255);