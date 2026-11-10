CREATE TABLE "augments" (
	"augment_id" text PRIMARY KEY NOT NULL,
	"set_number" smallint NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "comp_augments" (
	"comp_id" uuid NOT NULL,
	"augment_id" text NOT NULL,
	"priority" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "comp_augments_comp_id_augment_id_pk" PRIMARY KEY("comp_id","augment_id")
);
--> statement-breakpoint
CREATE TABLE "comp_items" (
	"comp_id" uuid NOT NULL,
	"unit_id" text NOT NULL,
	"item_ids" text[] DEFAULT '{}' NOT NULL,
	"priority" smallint DEFAULT 0 NOT NULL,
	"star_level" smallint DEFAULT 2 NOT NULL,
	CONSTRAINT "comp_items_comp_id_unit_id_pk" PRIMARY KEY("comp_id","unit_id")
);
--> statement-breakpoint
CREATE TABLE "comp_stats" (
	"comp_id" uuid NOT NULL,
	"patch" text NOT NULL,
	"region" text NOT NULL,
	"rank_bucket" text NOT NULL,
	"games" integer DEFAULT 0 NOT NULL,
	"place_sum" integer DEFAULT 0 NOT NULL,
	"top4_count" integer DEFAULT 0 NOT NULL,
	"win_count" integer DEFAULT 0 NOT NULL,
	"boards" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comp_stats_comp_id_patch_region_rank_bucket_pk" PRIMARY KEY("comp_id","patch","region","rank_bucket")
);
--> statement-breakpoint
CREATE TABLE "comps" (
	"comp_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"set_number" smallint NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"core_units" text[] DEFAULT '{}' NOT NULL,
	"flex_units" text[] DEFAULT '{}' NOT NULL,
	"defining_trait" text,
	"difficulty" text DEFAULT 'Medium' NOT NULL,
	"playstyle" text DEFAULT 'Standard' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"leveling" text DEFAULT '' NOT NULL,
	"notes_why_now" text DEFAULT '' NOT NULL,
	"notes_how_to_play" text DEFAULT '' NOT NULL,
	"notes_mistakes" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"item_id" text PRIMARY KEY NOT NULL,
	"set_number" smallint NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "match_queue" (
	"match_id" text PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"enqueued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"fetched_at" timestamp with time zone,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"match_id" text PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"patch" text NOT NULL,
	"set_number" smallint NOT NULL,
	"queue_id" integer,
	"game_datetime" timestamp with time zone,
	"game_version" text,
	"raw" jsonb,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participant_augments" (
	"match_id" text NOT NULL,
	"puuid" text NOT NULL,
	"augment_id" text NOT NULL,
	"slot_index" smallint NOT NULL,
	CONSTRAINT "participant_augments_match_id_puuid_slot_index_pk" PRIMARY KEY("match_id","puuid","slot_index")
);
--> statement-breakpoint
CREATE TABLE "participant_traits" (
	"match_id" text NOT NULL,
	"puuid" text NOT NULL,
	"trait_id" text NOT NULL,
	"num_units" smallint DEFAULT 0 NOT NULL,
	"tier_current" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "participant_traits_match_id_puuid_trait_id_pk" PRIMARY KEY("match_id","puuid","trait_id")
);
--> statement-breakpoint
CREATE TABLE "participant_units" (
	"match_id" text NOT NULL,
	"puuid" text NOT NULL,
	"unit_id" text NOT NULL,
	"star_level" smallint DEFAULT 1 NOT NULL,
	"item_0" text,
	"item_1" text,
	"item_2" text,
	"slot" smallint NOT NULL,
	CONSTRAINT "participant_units_match_id_puuid_slot_pk" PRIMARY KEY("match_id","puuid","slot")
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"match_id" text NOT NULL,
	"puuid" text NOT NULL,
	"placement" smallint NOT NULL,
	"level" smallint,
	"last_round" smallint,
	"gold_left" smallint,
	CONSTRAINT "participants_match_id_puuid_pk" PRIMARY KEY("match_id","puuid")
);
--> statement-breakpoint
CREATE TABLE "patches" (
	"patch" text PRIMARY KEY NOT NULL,
	"set_number" smallint NOT NULL,
	"released_at" timestamp with time zone,
	"notes_url" text
);
--> statement-breakpoint
CREATE TABLE "players" (
	"puuid" text PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"tier" text NOT NULL,
	"lp" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp with time zone,
	"last_cursor" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "traits" (
	"trait_id" text PRIMARY KEY NOT NULL,
	"set_number" smallint NOT NULL,
	"name" text NOT NULL,
	"breakpoints" integer[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "units" (
	"unit_id" text PRIMARY KEY NOT NULL,
	"set_number" smallint NOT NULL,
	"name" text NOT NULL,
	"cost" smallint NOT NULL,
	"traits" text[] DEFAULT '{}' NOT NULL,
	"image_url" text
);
--> statement-breakpoint
ALTER TABLE "comp_augments" ADD CONSTRAINT "comp_augments_comp_id_comps_comp_id_fk" FOREIGN KEY ("comp_id") REFERENCES "public"."comps"("comp_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comp_items" ADD CONSTRAINT "comp_items_comp_id_comps_comp_id_fk" FOREIGN KEY ("comp_id") REFERENCES "public"."comps"("comp_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comp_stats" ADD CONSTRAINT "comp_stats_comp_id_comps_comp_id_fk" FOREIGN KEY ("comp_id") REFERENCES "public"."comps"("comp_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_match_id_matches_match_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("match_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comp_stats_patch_idx" ON "comp_stats" USING btree ("patch","rank_bucket");--> statement-breakpoint
CREATE INDEX "comps_set_published_idx" ON "comps" USING btree ("set_number","published");--> statement-breakpoint
CREATE INDEX "match_queue_status_idx" ON "match_queue" USING btree ("status","enqueued_at");--> statement-breakpoint
CREATE INDEX "matches_patch_idx" ON "matches" USING btree ("patch");--> statement-breakpoint
CREATE INDEX "matches_datetime_idx" ON "matches" USING btree ("game_datetime");--> statement-breakpoint
CREATE INDEX "participant_units_unit_idx" ON "participant_units" USING btree ("unit_id");--> statement-breakpoint
CREATE INDEX "participants_puuid_idx" ON "participants" USING btree ("puuid");--> statement-breakpoint
CREATE INDEX "players_region_tier_idx" ON "players" USING btree ("region","tier");--> statement-breakpoint
CREATE INDEX "units_set_idx" ON "units" USING btree ("set_number");