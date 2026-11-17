CREATE TABLE "board_patterns" (
	"set_number" smallint NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"rank" smallint NOT NULL,
	"sample" integer DEFAULT 0 NOT NULL,
	"place_sum" integer DEFAULT 0 NOT NULL,
	"top4_count" integer DEFAULT 0 NOT NULL,
	"win_count" integer DEFAULT 0 NOT NULL,
	"extra" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "board_patterns_set_number_kind_key_pk" PRIMARY KEY("set_number","kind","key")
);
--> statement-breakpoint
CREATE TABLE "board_studies" (
	"set_number" smallint PRIMARY KEY NOT NULL,
	"patches" text[] DEFAULT '{}' NOT NULL,
	"matches" integer DEFAULT 0 NOT NULL,
	"boards" integer DEFAULT 0 NOT NULL,
	"units_seen" integer DEFAULT 0 NOT NULL,
	"items_seen" integer DEFAULT 0 NOT NULL,
	"item_slots" integer DEFAULT 0 NOT NULL,
	"place_sum" integer DEFAULT 0 NOT NULL,
	"top4_count" integer DEFAULT 0 NOT NULL,
	"win_count" integer DEFAULT 0 NOT NULL,
	"min_sample" smallint DEFAULT 25 NOT NULL,
	"min_pair_sample" smallint DEFAULT 15 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_patterns" ADD CONSTRAINT "board_patterns_set_number_board_studies_set_number_fk" FOREIGN KEY ("set_number") REFERENCES "public"."board_studies"("set_number") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "board_patterns_rank_idx" ON "board_patterns" USING btree ("set_number","kind","rank");