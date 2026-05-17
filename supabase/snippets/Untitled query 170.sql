DO $$
DECLARE
  v_email text := 'local.admin@tailytics.test';
  v_password text := 'TailyticsLocal123!';
  v_user_name text := 'Local Admin';
  v_tenant_name text := 'Local Tenant';
  v_tenant_id text;
  v_auth_user_id uuid;
BEGIN
  SELECT "id"
  INTO v_tenant_id
  FROM public."Tenant"
  WHERE "name" = v_tenant_name
  ORDER BY "createdAt" ASC
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    INSERT INTO public."Tenant" (
      "name",
      "updatedAt"
    )
    VALUES (
      v_tenant_name,
      now()
    )
    RETURNING "id" INTO v_tenant_id;
  END IF;

  SELECT id
  INTO v_auth_user_id
  FROM auth.users
  WHERE lower(email) = lower(v_email)
  LIMIT 1;

  IF v_auth_user_id IS NULL THEN
    v_auth_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_auth_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', array['email'],
        'tenantId', v_tenant_id
      ),
      jsonb_build_object(
        'name', v_user_name
      ),
      now(),
      now()
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      raw_app_meta_data =
        COALESCE(raw_app_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'provider', 'email',
          'providers', array['email'],
          'tenantId', v_tenant_id
        ),
      raw_user_meta_data =
        COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
          'name', v_user_name
        ),
      updated_at = now()
    WHERE id = v_auth_user_id;
  END IF;

  DELETE FROM auth.identities
  WHERE provider = 'email'
    AND user_id = v_auth_user_id;

  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid(),
    v_auth_user_id,
    v_auth_user_id::text,
    jsonb_build_object(
      'sub', v_auth_user_id::text,
      'email', v_email,
      'email_verified', true,
      'phone_verified', false
    ),
    'email',
    now(),
    now(),
    now()
  );

  INSERT INTO public."User" (
    "email",
    "name",
    "role",
    "tenantId",
    "supabaseUserId",
    "updatedAt"
  )
  VALUES (
    v_email,
    v_user_name,
    'ADMIN',
    v_tenant_id,
    v_auth_user_id::text,
    now()
  )
  ON CONFLICT ("email")
  DO UPDATE SET
    "name" = EXCLUDED."name",
    "role" = EXCLUDED."role",
    "tenantId" = EXCLUDED."tenantId",
    "supabaseUserId" = EXCLUDED."supabaseUserId",
    "updatedAt" = now();
END $$;

SELECT
  u.email,
  u.name,
  u.role,
  u."tenantId",
  t.name AS "tenantName",
  u."supabaseUserId",
  au.email_confirmed_at IS NOT NULL AS "emailConfirmed"
FROM public."User" u
JOIN public."Tenant" t
  ON t."id" = u."tenantId"
JOIN auth.users au
  ON au.id::text = u."supabaseUserId"
WHERE lower(u.email) = lower('local.admin@tailytics.test');