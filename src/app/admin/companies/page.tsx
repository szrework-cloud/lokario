"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";

type Company = {
  id: number;
  code: string;
  name: string;
  sector?: string | null;
  is_active: boolean;
  created_at: string;
};

type CompanyWithOwner = Company & {
  owner?: {
    id: number;
    email: string;
    full_name?: string | null;
  } | null;
};

export default function CompaniesPage() {
  const { token } = useAuth();
  const [companies, setCompanies] = useState<CompanyWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const loadCompanies = async () => {
      setLoading(true);
      setError(null);
      
      // Mock companies pour le développement
      const mockCompanies: CompanyWithOwner[] = [
        {
          id: 1,
          code: "123456",
          name: "Boulangerie Soleil",
          sector: "Commerce",
          is_active: true,
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          owner: {
            id: 1,
            email: "jean.dupont@boulangerie-soleil.fr",
            full_name: "Jean Dupont",
          },
        },
        {
          id: 2,
          code: "234567",
          name: "Coiffure Martin",
          sector: "Beauté / Coiffure",
          is_active: true,
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          owner: {
            id: 2,
            email: "marie.martin@coiffure-martin.fr",
            full_name: "Marie Martin",
          },
        },
      ];

      try {
        // Si pas d'API URL, utiliser directement les données mockées
        if (!process.env.NEXT_PUBLIC_API_URL) {
          setCompanies(mockCompanies);
          setLoading(false);
          return;
        }

        // Récupérer toutes les entreprises depuis l'API
        const companiesData = await apiGet<Company[]>("/companies", token);
        
        // S'assurer que companies est un tableau
        if (!Array.isArray(companiesData)) {
          throw new Error("Format de réponse invalide : companies n'est pas un tableau");
        }
        
        // Si aucune entreprise trouvée, utiliser des données mockées
        if (companiesData.length === 0) {
          setCompanies(mockCompanies);
          setLoading(false);
          return;
        }
        
        // Récupérer tous les users pour trouver les owners
        const usersResponse = await apiGet<any[]>("/users", token);
        const users = Array.isArray(usersResponse) ? usersResponse : [];
        
        // Filtrer les entreprises actives uniquement (double sécurité)
        const activeCompanies = companiesData.filter((company) => company.is_active === true);
        
        // Pour chaque entreprise, trouver son owner
        const companiesWithOwners = activeCompanies.map((company) => {
          const owner = users.find(
            (u) => u.role === "owner" && u.company_id === company.id
          );
          
          return {
            ...company,
            owner: owner
              ? {
                  id: owner.id,
                  email: owner.email,
                  full_name: owner.full_name,
                }
              : null,
          };
        });

        setCompanies(companiesWithOwners);
      } catch (err: any) {
        // En cas d'erreur, utiliser les données mockées
        console.error("Erreur lors du chargement des entreprises:", err);
        setCompanies(mockCompanies);
      } finally {
        setLoading(false);
      }
    };

    void loadCompanies();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader text="Chargement des entreprises..." />
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
        <h1 className="text-3xl font-bold text-[#0F172A]">Entreprises</h1>
        <p className="mt-2 text-sm text-[#64748B]">
          Liste de toutes les entreprises
        </p>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#F9FAFB]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Nom de l'entreprise
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#64748B] uppercase tracking-wider">
                Propriétaire
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
            {companies.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-sm text-[#64748B]">
                  Aucune entreprise trouvée
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id} className="hover:bg-[#F9FAFB]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-[#0F172A]">
                      {company.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-[#64748B] font-mono font-bold">
                      {company.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {company.owner ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-[#0F172A]">
                          {company.owner.full_name || "Sans nom"}
                        </span>
                        <span className="text-xs text-[#64748B]">{company.owner.email}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-[#64748B]">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                    {company.sector || "—"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        company.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {company.is_active ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#64748B]">
                    {new Date(company.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="text-sm font-medium text-[#F97316] hover:text-[#EA580C]"
                    >
                      Voir
                    </Link>
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

