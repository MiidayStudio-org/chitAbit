CREATE SCHEMA "chitabit";
--> statement-breakpoint
CREATE TABLE "chitabit"."channel_reads" (
	"user_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"last_read_at" bigint NOT NULL,
	CONSTRAINT "channel_reads_user_id_channel_id_pk" PRIMARY KEY("user_id","channel_id")
);
--> statement-breakpoint
CREATE TABLE "chitabit"."channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by" text NOT NULL,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chitabit"."friend_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" text NOT NULL,
	"receiver_id" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "friend_requests_sender_id_receiver_id_unique" UNIQUE("sender_id","receiver_id")
);
--> statement-breakpoint
CREATE TABLE "chitabit"."friends" (
	"user_id" text NOT NULL,
	"friend_id" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "friends_user_id_friend_id_pk" PRIMARY KEY("user_id","friend_id")
);
--> statement-breakpoint
CREATE TABLE "chitabit"."messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text,
	"dm_recipient_id" text,
	"sender_id" text NOT NULL,
	"sender_username" text NOT NULL,
	"message_language" text,
	"content" text NOT NULL,
	"attachment_url" text,
	"attachment_type" text,
	"attachment_name" text,
	"attachment_size" integer,
	"read_at" bigint,
	"edited_at" bigint,
	"deleted_at" bigint,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chitabit"."reactions" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"user_id" text NOT NULL,
	"emoji" text NOT NULL,
	"created_at" bigint NOT NULL,
	CONSTRAINT "reactions_message_id_user_id_emoji_unique" UNIQUE("message_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "chitabit"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text,
	"display_name" text NOT NULL,
	"avatar_color" text NOT NULL,
	"avatar_url" text,
	"bio" text DEFAULT 'Hey there! I am using ChatAbit.',
	"status" text DEFAULT 'Online',
	"file_icon" text DEFAULT 'ts',
	"message_language" text DEFAULT 'typescript',
	"color_theme" text DEFAULT 'dark-plus',
	"custom_accent_color" text,
	"highlight_all_messages" integer DEFAULT 1,
	"share_live_typing" integer DEFAULT 1,
	"is_bot" integer DEFAULT 0,
	"created_at" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chitabit"."channel_reads" ADD CONSTRAINT "channel_reads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "chitabit"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."channel_reads" ADD CONSTRAINT "channel_reads_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "chitabit"."channels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."friend_requests" ADD CONSTRAINT "friend_requests_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "chitabit"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."friend_requests" ADD CONSTRAINT "friend_requests_receiver_id_users_id_fk" FOREIGN KEY ("receiver_id") REFERENCES "chitabit"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."friends" ADD CONSTRAINT "friends_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "chitabit"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."friends" ADD CONSTRAINT "friends_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "chitabit"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."messages" ADD CONSTRAINT "messages_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "chitabit"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "chitabit"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."reactions" ADD CONSTRAINT "reactions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "chitabit"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chitabit"."reactions" ADD CONSTRAINT "reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "chitabit"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "channels_name_ci" ON "chitabit"."channels" USING btree (lower("name"));--> statement-breakpoint
CREATE INDEX "idx_friend_requests_receiver" ON "chitabit"."friend_requests" USING btree ("receiver_id","status");--> statement-breakpoint
CREATE INDEX "idx_friends_user" ON "chitabit"."friends" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_messages_channel" ON "chitabit"."messages" USING btree ("channel_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_dm" ON "chitabit"."messages" USING btree ("sender_id","dm_recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_dm_unread" ON "chitabit"."messages" USING btree ("dm_recipient_id","read_at");--> statement-breakpoint
CREATE INDEX "idx_reactions_message" ON "chitabit"."reactions" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_ci" ON "chitabit"."users" USING btree (lower("username"));