"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { Loader } from "@/components/ui/Loader";

type User = {
  id: number;
  email: string;
  full_name?: string | null;
  role: "super_admin" | "owner" | "user";
  company_id: number | null;
  company_name?: string | null;
  company_sector?: string | null;
  company_code?: string | null;
  is_active: boolean;
  email_verified: boolean;  // Ajout du champ email_verified
  created_at: string;
};

type Company = {
  id: number;
  code?: string;
  name: string;
  sector?: string | null;
};

export default function UsersPage() {
  const { token } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [newCompanyId, setNewCompanyId] = useState<number | null>(null);
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ isOpen: boolean; userId: number | null; userName: string; isOwner: boolean }>({ isOpen: false, userId: null, userName: "", isOwner: false });

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Charger les utilisateurs
        const usersData = await apiGet<User[]>("/users", token);
        setUsers(usersData || []);

        // Charger les entreprises
        const companiesData = await apiGet<Company[]>("/companies", token);
        setCompanies(companiesData || []);
      } catch (err: any) {
        console.error("Erreur lors du chargement:", err);
        setError(err.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [token]);

  const handleUpdateUser = async (userId: number) => {
    if (!token) return;

    try {
      const payload: any = {};
      
      if (newRole) {
        payload.role = newRole;
      }
      
      if (newCompanyId !== null) {
        payload.company_id = newCompanyId === 0 ? null : newCompanyId;
      }

      const updatedUser = await apiPatch<User>(`/users/${userId}`, payload, token);
      
      // Mettre à jour la liste
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      setEditingUser(null);
      setNewRole("");
      setNewCompanyId(null);
    } catch (err: any) {
      console.error("Erreur lors de la mise à jour:", err);
      showToast(err.message || "Erreur lors de la mise à jour", "error");
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user.id);
    setNewRole(user.role);
    setNewCompanyId(user.company_id || 0);
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setNewRole("");
    setNewCompanyId(null);
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!token) return;
    
    const userToDelete = users.find(u => u.id === userId);
    const isOwner = userToDelete?.role === "owner";
    setDeleteConfirmModal({ isOpen: true, userId, userName, isOwner });
  };

  const confirmDeleteUser = async () => {
    if (!deleteConfirmModal.userId) return;
    const userId = deleteConfirmModal.userId;

    try {
      await apiDelete(`/users/${userId}`, token);
      setDeleteConfirmModal({ isOpen: false, userId: null, userName: "", isOwner: false });
      
      // Recharger toutes les données (utilisateurs et entreprises)
      // car l'entreprise peut avoir été supprimée aussi
      const loadData = async () => {
        try {
          const usersData = await apiGet<User[]>("/users", token);
          setUsers(usersData || []);
          
          const companiesData = await apiGet<Company[]>("/companies", token);
          setCompanies(companiesData || []);
        } catch (err: any) {
          console.error("Erreur lors du rechargement:", err);
        }
      };
      
      await loadData();
      setEditingUser(null);
    } catch (err: any) {
      console.error("Erreur lors de la suppression:", err);
      showToast(err.message || "Erreur lors de la suppression", "error");
      setDeleteConfirmModal({ isOpen: false, userId: null, userName: "", isOwner: false });
    }
  };

  // Séparer les utilisateurs vérifiés et non vérifiés
  const unverifiedUsers: User[] = [];
  const verifiedUsers: User[] = [];

  users.forEach((user) => {
    // Ignorer les super_admin (ne pas les afficher)
    if (user.role === "super_admin") return;
    
    // Séparer les utilisateurs non vérifiés
    if (!user.email_verified) {
      unverifiedUsers.push(user);
      return; // Ne pas les inclure dans les tableaux par entreprise
    }
    
    verifiedUsers.push(user);
  });

  // Grouper les utilisateurs vérifiés par entreprise
  const usersByCompany = new Map<number, { company: Company; owners: User[]; users: User[] }>();
  const unassignedUsers: User[] = [];

  verifiedUsers.forEach((user) => {
    if (!user.company_id) {
      // Utilisateur sans entreprise = nouveau compte à assigner
      unassignedUsers.push(user);
      return;
    }

    if (!usersByCompany.has(user.company_id)) {
      const company = companies.find(c => c.id === user.company_id);
      if (company) {
        usersByCompany.set(user.company_id, {
          company,
          owners: [],
          users: []
        });
      } else {
        // Entreprise introuvable, mettre dans non assignés
        unassignedUsers.push(user);
        return;
      }
    }

    const companyData = usersByCompany.get(user.company_id)!;
    if (user.role === "owner") {
      companyData.owners.push(user);
    } else if (user.role === "user") {
      companyData.users.push(user);
    }
  });

  // Trier les entreprises par nom
  const sortedCompanies = Array.from(usersByCompany.values()).sort((a, b) => 
    a.company.name.localeCompare(b.company.name)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader text="Chargement des utilisateurs..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Gestion des utilisateurs</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Gérez les rôles et assignez les utilisateurs aux entreprises
        </p>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#0F172A]">{sortedCompanies.length}</div>
            <div className="text-sm text-[#64748B]">Entreprises</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#0F172A]">
              {sortedCompanies.reduce((sum, c) => sum + c.owners.length, 0)}
            </div>
            <div className="text-sm text-[#64748B]">Owners</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#0F172A]">
              {sortedCompanies.reduce((sum, c) => sum + c.users.length, 0)}
            </div>
            <div className="text-sm text-[#64748B]">Users</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-[#0F172A]">{unassignedUsers.length}</div>
            <div className="text-sm text-[#64748B]">À assigner</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{unverifiedUsers.length}</div>
            <div className="text-sm text-[#64748B]">Non vérifiés</div>
          </CardContent>
        </Card>
      </div>

      {/* Comptes non vérifiés */}
      {unverifiedUsers.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-6 border-b border-[#E5E7EB] bg-orange-50">
              <h2 className="text-xl font-semibold text-[#0F172A]">⚠️ Comptes non vérifiés</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Ces comptes n'ont pas encore vérifié leur email. Ils n'apparaissent pas dans les tableaux d'entreprise.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Nom / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Entreprise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {unverifiedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-[#0F172A]">
                            {user.full_name || "Sans nom"}
                          </div>
                          <div className="text-sm text-[#64748B]">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="text-sm border border-[#E5E7EB] rounded px-2 py-1"
                          >
                            <option value="owner">Owner</option>
                            <option value="user">User</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === "super_admin" ? "bg-purple-100 text-purple-800" :
                            user.role === "owner" ? "bg-blue-100 text-blue-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {user.role === "super_admin" ? "Super Admin" :
                             user.role === "owner" ? "Owner" : "User"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <select
                            value={newCompanyId || 0}
                            onChange={(e) => setNewCompanyId(parseInt(e.target.value) || 0)}
                            className="text-sm border border-[#E5E7EB] rounded px-2 py-1 w-full"
                            disabled={newRole === "super_admin"}
                          >
                            <option value={0}>Sélectionner une entreprise</option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-[#64748B]">
                            {user.company_name || "Aucune"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {user.is_active ? "Actif" : "Inactif"}
                          </span>
                          <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
                            Email non vérifié
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUser === user.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateUser(user.id)}
                              className="text-[#F97316] hover:text-[#EA580C] font-medium"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-[#64748B] hover:text-[#0F172A]"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(user)}
                              className="text-[#F97316] hover:text-[#EA580C] font-medium"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Supprimer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nouveaux comptes à assigner (sans entreprise) - seulement les vérifiés */}
      {unassignedUsers.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="p-6 border-b border-[#E5E7EB]">
              <h2 className="text-xl font-semibold text-[#0F172A]">🆕 Comptes à assigner</h2>
              <p className="mt-1 text-sm text-[#64748B]">
                Utilisateurs sans entreprise - Assignez-les à une entreprise
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F9FAFB]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Nom / Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Rôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Entreprise
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Statut
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {unassignedUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#F9FAFB]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-[#0F172A]">
                            {user.full_name || "Sans nom"}
                          </div>
                          <div className="text-sm text-[#64748B]">{user.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <select
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value)}
                            className="text-sm border border-[#E5E7EB] rounded px-2 py-1"
                          >
                            <option value="owner">Owner</option>
                            <option value="user">User</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.role === "super_admin" ? "bg-purple-100 text-purple-800" :
                            user.role === "owner" ? "bg-blue-100 text-blue-800" :
                            "bg-green-100 text-green-800"
                          }`}>
                            {user.role === "super_admin" ? "Super Admin" :
                             user.role === "owner" ? "Owner" : "User"}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingUser === user.id ? (
                          <select
                            value={newCompanyId || 0}
                            onChange={(e) => setNewCompanyId(parseInt(e.target.value) || 0)}
                            className="text-sm border border-[#E5E7EB] rounded px-2 py-1 w-full"
                            disabled={newRole === "super_admin"}
                          >
                            <option value={0}>Sélectionner une entreprise</option>
                            {companies.map((company) => (
                              <option key={company.id} value={company.id}>
                                {company.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-[#64748B]">Aucune</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {user.is_active ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {editingUser === user.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdateUser(user.id)}
                              className="text-[#F97316] hover:text-[#EA580C] font-medium"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-[#64748B] hover:text-[#0F172A]"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(user)}
                              className="text-[#F97316] hover:text-[#EA580C] font-medium"
                            >
                              Assigner
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Supprimer
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableaux par entreprise */}
      {sortedCompanies.map(({ company, owners, users: companyUsers }) => {
        const allCompanyUsers = [...owners, ...companyUsers];
        if (allCompanyUsers.length === 0) return null;

        return (
          <Card key={company.id}>
            <CardContent className="p-0">
              <div className="p-6 border-b border-[#E5E7EB]">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-[#0F172A]">{company.name}</h2>
                    {company.sector && (
                      <p className="mt-1 text-sm text-[#64748B]">{company.sector}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-[#F97316] font-mono">{company.code || `ID: ${company.id}`}</div>
                    <div className="text-xs text-[#64748B] mt-1">Code entreprise</div>
                  </div>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-[#64748B]">
                  <span>{owners.length} owner{owners.length > 1 ? 's' : ''}</span>
                  <span>{companyUsers.length} user{companyUsers.length > 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#F9FAFB]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                        Nom / Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                        Rôle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                        Statut
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]">
                    {/* Owners en premier */}
                    {owners.map((user) => (
                      <tr key={user.id} className="hover:bg-[#F9FAFB]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-[#0F172A]">
                              {user.full_name || "Sans nom"}
                            </div>
                            <div className="text-sm text-[#64748B]">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value)}
                              className="text-sm border border-[#E5E7EB] rounded px-2 py-1"
                            >
                              <option value="owner">Owner</option>
                              <option value="user">User</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Owner
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {user.is_active ? "Actif" : "Inactif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingUser === user.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateUser(user.id)}
                                className="text-[#F97316] hover:text-[#EA580C] font-medium"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-[#64748B] hover:text-[#0F172A]"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(user)}
                                className="text-[#F97316] hover:text-[#EA580C] font-medium"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {/* Users ensuite */}
                    {companyUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-[#F9FAFB]">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-[#0F172A]">
                              {user.full_name || "Sans nom"}
                            </div>
                            <div className="text-sm text-[#64748B]">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {editingUser === user.id ? (
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value)}
                              className="text-sm border border-[#E5E7EB] rounded px-2 py-1"
                            >
                              <option value="owner">Owner</option>
                              <option value="user">User</option>
                              <option value="super_admin">Super Admin</option>
                            </select>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}>
                            {user.is_active ? "Actif" : "Inactif"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {editingUser === user.id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateUser(user.id)}
                                className="text-[#F97316] hover:text-[#EA580C] font-medium"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="text-[#64748B] hover:text-[#0F172A]"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(user)}
                                className="text-[#F97316] hover:text-[#EA580C] font-medium"
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user.id, user.full_name || user.email)}
                                className="text-red-600 hover:text-red-800 font-medium"
                              >
                                Supprimer
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {users.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-[#64748B]">
            Aucun utilisateur trouvé
          </CardContent>
        </Card>
      )}

      {/* Modal de confirmation de suppression */}
      <ConfirmModal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, userId: null, userName: "", isOwner: false })}
        onConfirm={confirmDeleteUser}
        title="Supprimer l'utilisateur"
        message={
          deleteConfirmModal.isOwner
            ? `Êtes-vous sûr de vouloir supprimer l'utilisateur "${deleteConfirmModal.userName}" ?\n\n⚠️ ATTENTION : Si c'est le dernier owner de l'entreprise, l'entreprise et tous ses utilisateurs seront également supprimés.\n\nCette action est irréversible.`
            : `Êtes-vous sûr de vouloir supprimer l'utilisateur "${deleteConfirmModal.userName}" ? Cette action est irréversible.`
        }
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="danger"
      />
    </div>
  );
}

