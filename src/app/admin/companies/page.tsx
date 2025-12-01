"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";

type OwnerUser = {
  id: number;
  email: string;
  full_name?: string | null;
  role: string;
  company_id: number | null;
  is_active: boolean;
  created_at: string;
};

type Company = {
  id: number;
  name: string;
  sector?: string | null;
  is_active: boolean;
  created_at: string;
};

type OwnerWithCompany = OwnerUser & {
  company: Company | null;
};

export default function CompaniesPage() {
  const { token } = useAuth();
  const [owners, setOwners] = useState<OwnerWithCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadOwners = async () => {
      setLoading(true);
      setError(null);
      try {
        // Récupérer tous les users
        const usersResponse = await apiGet<OwnerUser[] | { users?: OwnerUser[] }>("/users", token);
        
        // Gérer différents formats de réponse
        const users = Array.isArray(usersResponse) 
          ? usersResponse 
          : (usersResponse?.users || []);
        
        // S'assurer que users est un tableau
        if (!Array.isArray(users)) {
          throw new Error("Format de réponse invalide : users n'est pas un tableau");
        }
        
        // Filtrer les owners
        let ownerUsers = users.filter((u) => u.role === "owner");
        
        // Si aucun owner trouvé, utiliser des données mockées pour le développement
        if (ownerUsers.length === 0 && !process.env.NEXT_PUBLIC_API_URL) {
          ownerUsers = [
            {
              id: 1,
              email: "jean.dupont@boulangerie-soleil.fr",
              full_name: "Jean Dupont",
              role: "owner",
              company_id: 1,
              is_active: true,
              created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
              id: 2,
              email: "marie.martin@coiffure-martin.fr",
              full_name: "Marie Martin",
              role: "owner",
              company_id: 2,
              is_active: true,
              created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
            },
          ];
        }
        
        // Pour chaque owner, récupérer sa company
        const ownersWithCompanies = await Promise.all(
          ownerUsers.map(async (owner) => {
            let company: Company | null = null;
            if (owner.company_id) {
              try {
                company = await apiGet<Company>(
                  `/companies/${owner.company_id}`,
                  token
                );
              } catch {
                // Si l'API échoue, utiliser des données mockées
                if (!process.env.NEXT_PUBLIC_API_URL) {
                  const mockCompanies: Record<number, Company> = {
                    1: {
                      id: 1,
                      name: "Boulangerie Soleil",
                      sector: "Commerce",
                      is_active: true,
                      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                    2: {
                      id: 2,
                      name: "Coiffure Martin",
                      sector: "Beauté / Coiffure",
                      is_active: true,
                      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                    },
                  };
                  company = mockCompanies[owner.company_id] || null;
                }
              }
            }
            return { ...owner, company };
          })
        );

        setOwners(ownersWithCompanies);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement des owners");
      } finally {
        setLoading(false);
      }
    };

    void loadOwners();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader text="Chargement des comptes owners..." />
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
        <h1 className="text-3xl font-bold text-[#0F172A]">Comptes Owners</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Liste de tous les comptes propriétaires d'entreprises
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F9FAFB]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Nom / Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Entreprise
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Secteur
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Statut
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Date de création
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {owners.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-[#64748B]">
                  Aucun compte owner trouvé
                </td>
              </tr>
            ) : (
              owners.map((owner) => (
                <tr key={owner.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[#0F172A]">
                        {owner.full_name || "Sans nom"}
                      </span>
                      <span className="text-xs text-[#64748B]">{owner.email}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#0F172A]">
                    {owner.company && owner.company.id ? (
                      <Link
                        href={`/admin/companies/${owner.company.id}`}
                        className="font-medium hover:text-[#F97316]"
                      >
                        {owner.company.name}
                      </Link>
                    ) : (
                      <span className="text-[#64748B]">Aucune entreprise</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                    {owner.company?.sector || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        owner.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {owner.is_active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                    {new Date(owner.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {owner.company && owner.company.id ? (
                      <Link
                        href={`/admin/companies/${owner.company.id}`}
                        className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                      >
                        Voir
                      </Link>
                    ) : (
                      <span className="text-sm text-[#64748B]">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

