import { ClipboardList, KeyRound, LogIn, LogOut } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { paths } from '../../app/paths';
import { isUnauthorized, useLogin, useLogout, useSession } from '../../api';
import { useT } from '../../i18n';
import { LIMITS } from '../../shared/api-schemas';
import {
  Button,
  Callout,
  Card,
  Field,
  Grid,
  Input,
  LinkButton,
  PageHeader,
  SkeletonText,
  Stack,
  Text,
  useToast,
} from '../../ui';
import { useErrorMessage } from '../shared/errors';

/** Only same-app paths are allowed as a post-login destination (no `//evil.com`). */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) {
    return paths.board();
  }
  return next === paths.login() || next.startsWith(`${paths.login()}?`) ? paths.board() : next;
}

/** Route `/login?next=/path` — name + house code. */
export function LoginScreen() {
  const t = useT('auth');
  const session = useSession();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));

  return (
    <>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} description={t('description')} />
      <Grid mdCols={2} gap="lg" align="start">
        <Card padding="lg">
          {session.isPending ? (
            <SkeletonText lines={4} />
          ) : session.name ? (
            <SignedIn name={session.name} next={next} />
          ) : (
            <LoginForm next={next} />
          )}
        </Card>
        <Callout
          tone="neutral"
          icon={ClipboardList}
          title={t('readOnlyTitle')}
          action={
            <LinkButton as={Link} to={paths.board()} variant="ghost" size="sm">
              {t('browseBoard')}
            </LinkButton>
          }
        >
          {t('readOnlyBody')}
        </Callout>
      </Grid>
    </>
  );
}

interface FormErrors {
  name?: string;
  code?: string;
}

function LoginForm({ next }: { next: string }) {
  const t = useT('auth');
  const tc = useT('common');
  const login = useLogin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const errorMessage = useErrorMessage();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string>();

  function submit(event: FormEvent<HTMLElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    const found: FormErrors = {};
    if (!trimmed) found.name = tc('errors.required');
    else if (trimmed.length > LIMITS.name) found.name = tc('errors.tooLong', { max: LIMITS.name });
    if (!code) found.code = tc('errors.required');
    setErrors(found);
    setFormError(undefined);
    if (found.name || found.code) return;

    login.mutate(
      { name: trimmed, code },
      {
        onSuccess: (me) => {
          toast({ tone: 'success', title: t('welcome', { name: me.name ?? trimmed }) });
          navigate(next, { replace: true });
        },
        onError: (error) => {
          if (isUnauthorized(error)) {
            setErrors({ code: t('wrongCode') });
            setCode('');
          } else {
            setFormError(errorMessage(error));
          }
        },
      },
    );
  }

  return (
    <Stack as="form" gap="md" onSubmit={submit} noValidate aria-label={t('title')}>
      {formError && <Callout tone="danger">{formError}</Callout>}
      <Field label={tc('fields.name')} hint={t('nameHint')} error={errors.name} required>
        <Input value={name} onValueChange={setName} autoComplete="name" maxLength={LIMITS.name} />
      </Field>
      <Field label={tc('fields.houseCode')} hint={t('codeHint')} error={errors.code} required>
        <Input
          type="password"
          value={code}
          onValueChange={setCode}
          leadingIcon={KeyRound}
          autoComplete="current-password"
          maxLength={LIMITS.houseCode}
        />
      </Field>
      <Button type="submit" size="lg" fullWidth leadingIcon={LogIn} loading={login.isPending}>
        {t('submit')}
      </Button>
    </Stack>
  );
}

function SignedIn({ name, next }: { name: string; next: string }) {
  const t = useT('auth');
  const logout = useLogout();
  return (
    <Stack gap="md">
      <Stack gap="xs">
        <Text size="lg" weight="semibold" display>
          {t('alreadyTitle')}
        </Text>
        <Text tone="muted">{t('alreadyBody', { name })}</Text>
      </Stack>
      <Stack direction="responsive" gap="sm">
        <LinkButton as={Link} to={next} variant="primary">
          {t('continue')}
        </LinkButton>
        <Button
          variant="secondary"
          leadingIcon={LogOut}
          loading={logout.isPending}
          onClick={() => logout.mutate()}
        >
          {t('signOutInstead')}
        </Button>
      </Stack>
    </Stack>
  );
}
