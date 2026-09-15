-- Migration 030: حذف کامل ماژول کارگاه فنرزنی و تولید (Springing Workshop)
DROP TABLE IF EXISTS springing_operation_materials CASCADE;
DROP TABLE IF EXISTS springing_operations CASCADE;
DROP TABLE IF EXISTS springing_workstations CASCADE;
