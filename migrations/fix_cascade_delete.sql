-- Migration to add ON DELETE CASCADE to foreign keys for form_config and registrations
-- This allows deleting a form to automatically delete its associated configurations and registrations

-- 1. Update form_config foreign key
ALTER TABLE form_config 
DROP CONSTRAINT IF EXISTS form_config_form_id_fkey,
ADD CONSTRAINT form_config_form_id_fkey 
    FOREIGN KEY (form_id) 
    REFERENCES forms(id) 
    ON DELETE CASCADE;

-- 2. Update registrations foreign key
ALTER TABLE registrations 
DROP CONSTRAINT IF EXISTS registrations_form_id_fkey,
ADD CONSTRAINT registrations_form_id_fkey 
    FOREIGN KEY (form_id) 
    REFERENCES forms(id) 
    ON DELETE CASCADE;
