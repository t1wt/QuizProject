import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

const databasePath = process.env.DATABASE_PATH || 'server/data/quizroom.db';

export function initDatabase() {
  const absolutePath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

  const db = new Database(absolutePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    create table if not exists users (
      id integer primary key autoincrement,
      name text not null,
      email text not null unique,
      password_hash text not null,
      role text not null check (role in ('organizer', 'participant')),
      created_at text not null default current_timestamp
    );

    create table if not exists quizzes (
      id integer primary key autoincrement,
      organizer_id integer not null,
      title text not null,
      category text,
      time_limit_seconds integer not null default 30,
      rules text,
      created_at text not null default current_timestamp,
      foreign key (organizer_id) references users(id) on delete cascade
    );

    create table if not exists questions (
      id integer primary key autoincrement,
      quiz_id integer not null,
      text text not null,
      image_url text,
      type text not null check (type in ('single', 'multiple')),
      position integer not null,
      created_at text not null default current_timestamp,
      foreign key (quiz_id) references quizzes(id) on delete cascade
    );

    create table if not exists answers (
      id integer primary key autoincrement,
      question_id integer not null,
      text text not null,
      is_correct integer not null default 0 check (is_correct in (0, 1)),
      position integer not null,
      foreign key (question_id) references questions(id) on delete cascade
    );

    create table if not exists quiz_sessions (
      id integer primary key autoincrement,
      quiz_id integer not null,
      room_code text not null unique,
      status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
      current_question_id integer,
      started_at text,
      finished_at text,
      created_at text not null default current_timestamp,
      foreign key (quiz_id) references quizzes(id) on delete cascade,
      foreign key (current_question_id) references questions(id) on delete set null
    );

    create table if not exists session_participants (
      id integer primary key autoincrement,
      session_id integer not null,
      user_id integer,
      guest_name text,
      score integer not null default 0,
      joined_at text not null default current_timestamp,
      foreign key (session_id) references quiz_sessions(id) on delete cascade,
      foreign key (user_id) references users(id) on delete set null
    );

    create table if not exists participant_answers (
      id integer primary key autoincrement,
      session_participant_id integer not null,
      question_id integer not null,
      answer_id integer not null,
      submitted_at text not null default current_timestamp,
      foreign key (session_participant_id) references session_participants(id) on delete cascade,
      foreign key (question_id) references questions(id) on delete cascade,
      foreign key (answer_id) references answers(id) on delete cascade
    );
  `);

  return db;
}
