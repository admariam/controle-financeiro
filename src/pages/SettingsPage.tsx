import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, RefreshCw, Tags, UserRound, Users } from 'lucide-react';
import { useProfile } from '../auth/ProfileProvider';
import { useSession } from '../auth/SessionProvider';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import {
  createCategory,
  updateCategoryName,
  updateProfileNameSafe,
} from '../data/api';
import { useDataRefresh } from '../data/DataRefreshProvider';
import { useCategories } from '../data/useData';
import type { Category, Profile } from '../types/db';

function ProfileRow({ profile }: { profile: Profile }) {
  const { profile: selectedProfile, refreshProfiles } = useProfile();
  const { refresh } = useDataRefresh();
  const { showToast } = useToast();

  const [name, setName] = useState(profile.name);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile.name);
  }, [profile.name]);

  const trimmed = name.trim();
  const dirty = trimmed !== profile.name;

  async function handleSave() {
    if (!trimmed) {
      showToast('O nome do perfil não pode ficar vazio.', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateProfileNameSafe(profile.id, trimmed);
      await refreshProfiles();
      refresh();
      showToast('Perfil atualizado.');
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : 'Não foi possível atualizar o perfil.',
        'error',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 items-center gap-3 sm:w-52">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
          {profile.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium text-slate-900">{profile.name}</p>
            {selectedProfile?.id === profile.id ? (
              <Badge tone="success">Em uso</Badge>
            ) : null}
          </div>
          <p className="text-[11px] text-slate-400">Perfil da família</p>
        </div>
      </div>

      <div className="flex flex-1 gap-2">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          aria-label={`Nome do perfil ${profile.name}`}
          className="h-9"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          loading={saving}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}

function CategoryRow({ category }: { category: Category }) {
  const { refresh } = useDataRefresh();
  const { showToast } = useToast();

  const [name, setName] = useState(category.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(category.name);
  }, [category.name]);

  const trimmed = name.trim();
  const dirty = trimmed !== category.name;

  async function handleSave() {
    setError(null);

    if (!trimmed) {
      setError('Informe um nome.');
      return;
    }

    setSaving(true);
    try {
      await updateCategoryName(category.id, trimmed);
      refresh();
      showToast('Categoria atualizada.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="hidden h-4 w-1 shrink-0 rounded-full bg-slate-200 sm:block" aria-hidden />
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={40}
          aria-label={`Nome da categoria ${category.name}`}
          className="h-9"
          invalid={Boolean(error)}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          loading={saving}
        >
          Salvar
        </Button>
      </div>
      {error ? <p className="mt-1 pl-3 text-[11px] text-red-600">{error}</p> : null}
    </li>
  );
}

export function SettingsPage() {
  const { profile, profiles } = useProfile();
  const { signOut } = useSession();
  const { refresh } = useDataRefresh();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const {
    data: categories,
    loading: categoriesLoading,
    error: categoriesError,
    reload: reloadCategories,
  } = useCategories();

  const [newCategory, setNewCategory] = useState('');
  const [creating, setCreating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleCreateCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCategory.trim();

    if (!name) {
      showToast('Informe o nome da categoria.', 'error');
      return;
    }

    setCreating(true);
    try {
      await createCategory(name);
      setNewCategory('');
      refresh();
      showToast('Categoria criada.');
    } catch (caught) {
      showToast(
        caught instanceof Error ? caught.message : 'Não foi possível criar a categoria.',
        'error',
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <>
      <PageHeader title="Configurações" description="Perfis, categorias e sessão." />

      <div className="space-y-4">
        <Card>
          <CardHeader
            title="Perfis"
            description="Os dois perfis compartilham os mesmos lançamentos e o mesmo banco de dados."
          />
          {profiles.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Users}
                title="Perfis não encontrados"
                description="Verifique se o banco foi configurado com os perfis Esposo e Esposa."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {profiles.map((item) => (
                <ProfileRow key={item.id} profile={item} />
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Categorias"
            description="As categorias classificam as contas e alimentam os relatórios."
          />

          <form
            onSubmit={handleCreateCategory}
            className="flex items-center gap-2 border-b border-slate-100 px-4 py-3"
          >
            <Input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Nova categoria"
              aria-label="Nome da nova categoria"
              maxLength={40}
              className="h-9"
            />
            <Button
              type="submit"
              size="sm"
              loading={creating}
              disabled={!newCategory.trim()}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Adicionar
            </Button>
          </form>

          {categoriesLoading && categories.length === 0 ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner />
            </div>
          ) : categoriesError && categories.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-600">{categoriesError}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => void reloadCategories()}>
                <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                Tentar novamente
              </Button>
            </div>
          ) : categories.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={Tags}
                title="Nenhuma categoria"
                description="Cadastre a primeira categoria usando o campo acima."
              />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {categories.map((category) => (
                <CategoryRow key={category.id} category={category} />
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Sessão" />
          <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UserRound className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-sm text-slate-700">
                  Perfil em uso:{' '}
                  <span className="font-medium text-slate-900">{profile?.name ?? '—'}</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Acesso único compartilhado entre os dois perfis.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate('/perfil')}>
                Trocar perfil
              </Button>
              <Button variant="danger" onClick={() => void handleSignOut()} loading={signingOut}>
                <LogOut className="h-4 w-4" aria-hidden />
                Sair
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
