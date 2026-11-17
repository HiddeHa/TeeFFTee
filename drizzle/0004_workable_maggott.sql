CREATE TABLE "comp_augment_stats" (
	"comp_id" uuid NOT NULL,
	"patch" text NOT NULL,
	"region" text NOT NULL,
	"rank_bucket" text NOT NULL,
	"augment_id" text NOT NULL,
	"games" integer DEFAULT 0 NOT NULL,
	"place_sum" integer DEFAULT 0 NOT NULL,
	"top4_count" integer DEFAULT 0 NOT NULL,
	"win_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comp_augment_stats_comp_id_patch_region_rank_bucket_augment_id_pk" PRIMARY KEY("comp_id","patch","region","rank_bucket","augment_id")
);
--> statement-breakpoint
ALTER TABLE "comp_augment_stats" ADD CONSTRAINT "comp_augment_stats_comp_id_comps_comp_id_fk" FOREIGN KEY ("comp_id") REFERENCES "public"."comps"("comp_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comp_augment_stats_scope_idx" ON "comp_augment_stats" USING btree ("patch","rank_bucket");