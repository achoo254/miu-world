CREATE TABLE "bot_world_memories" (
	"bot_id" text NOT NULL,
	"map_id" text NOT NULL,
	"grid_version" text NOT NULL,
	"memory" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bot_world_memories_bot_id_map_id_pk" PRIMARY KEY("bot_id","map_id"),
	CONSTRAINT "bot_world_memories_size" CHECK (octet_length("bot_world_memories"."memory"::text) <= 65536)
);
