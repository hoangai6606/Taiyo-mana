CREATE TYPE "public"."user_role" AS ENUM('staff', 'leader', 'manager', 'accounting_admin');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_jp" varchar(255) DEFAULT '' NOT NULL,
	"currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "customers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "daily_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"specifications" integer,
	"accessories" integer,
	"appearance" integer,
	"fabric" integer,
	"dirty" integer,
	"seam_defect" integer,
	"other" integer,
	"metal_check" integer
);
--> statement-breakpoint
CREATE TABLE "factories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_jp" varchar(255) DEFAULT '' NOT NULL,
	"country" varchar(10) DEFAULT 'VN' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid,
	CONSTRAINT "factories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "inspection_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"inspection_date" timestamp with time zone,
	"inspection_content" varchar(500),
	"product_code" varchar(100),
	"brand" varchar(100),
	"product_name" varchar(255),
	"color" varchar(100),
	"size" varchar(50),
	"inspected_quantity" integer,
	"passed_quantity" integer,
	"defective_quantity" integer
);
--> statement-breakpoint
CREATE TABLE "inspection_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"factory_ids" text DEFAULT '[]' NOT NULL,
	"inspection_date" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "product_styles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"style_code" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"customer_id" uuid NOT NULL,
	"factory_id" uuid NOT NULL,
	"product_type_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"name_jp" varchar(255) DEFAULT '' NOT NULL,
	CONSTRAINT "product_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "productivity_tracking" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"record_id" uuid NOT NULL,
	"qc_quantity" integer,
	"transit_quantity" integer,
	"ot" integer
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"name_vn" varchar(255) NOT NULL,
	"name_jp" varchar(255) DEFAULT '' NOT NULL,
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"factory_id" uuid,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_factory_permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"factory_id" uuid NOT NULL,
	"access_level" varchar(20) DEFAULT 'read_only' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid
);
--> statement-breakpoint
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_record_id_inspection_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."inspection_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspection_items" ADD CONSTRAINT "inspection_items_record_id_inspection_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."inspection_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productivity_tracking" ADD CONSTRAINT "productivity_tracking_record_id_inspection_records_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."inspection_records"("id") ON DELETE cascade ON UPDATE no action;