CREATE TABLE "player_positions" (
	"child_id" uuid NOT NULL,
	"map_id" text NOT NULL,
	"x" double precision NOT NULL,
	"y" double precision NOT NULL,
	"z" double precision NOT NULL,
	"facing" double precision NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "player_positions_child_id_map_id_pk" PRIMARY KEY("child_id","map_id")
);
--> statement-breakpoint
ALTER TABLE "player_positions" ADD CONSTRAINT "player_positions_child_id_child_profiles_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."child_profiles"("id") ON DELETE cascade ON UPDATE no action;