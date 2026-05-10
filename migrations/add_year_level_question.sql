-- Add "Year Level" dropdown to Tech de Tsunagaru form
-- Form ID: 00000000-0000-0000-0000-000000000001

INSERT INTO form_config (form_id, label_en, label_ja, placeholder_en, placeholder_ja, type, required, target_lanyard_field, sort_order, options)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Year Level',
    '学年',
    'Select your year level',
    '学年を選択してください',
    'dropdown',
    true,
    'none',
    2.5, -- Temporarily set between Name (1) and Interest (2) - builder will fix it on next save
    '[
        {"label_en": "B1", "label_ja": "B1 (学部1年)", "value": "B1"},
        {"label_en": "B2", "label_ja": "B2 (学部2年)", "value": "B2"},
        {"label_en": "B3", "label_ja": "B3 (学部3年)", "value": "B3"},
        {"label_en": "B4", "label_ja": "B4 (学部4年)", "value": "B4"},
        {"label_en": "B5", "label_ja": "B5 (学部5年)", "value": "B5"},
        {"label_en": "B6", "label_ja": "B6 (学部6年)", "value": "B6"},
        {"label_en": "M1", "label_ja": "M1 (修士1年)", "value": "M1"},
        {"label_en": "M2", "label_ja": "M2 (修士2年)", "value": "M2"},
        {"label_en": "D1", "label_ja": "D1 (博士1年)", "value": "D1"},
        {"label_en": "D2", "label_ja": "D2 (博士2年)", "value": "D2"},
        {"label_en": "D3", "label_ja": "D3 (博士3年)", "value": "D3"},
        {"label_en": "Post-grad", "label_ja": "ポスドク / 既卒", "value": "postgrad"},
        {"label_en": "Staff / Faculty", "label_ja": "教職員", "value": "staff"},
        {"label_en": "Other", "label_ja": "その他", "value": "other"}
    ]'::jsonb
);
