# GridForge

GridForge est un générateur intelligent de structures pour mots croisés et mots fléchés, conçu pour être performant, moderne et facilement déployable.

## 🚀 Vision du Projet

L'objectif de GridForge est de simplifier la création de grilles de jeux de lettres en automatisant le placement des mots et des cases noires tout en respectant les contraintes linguistiques et structurelles.

### Périmètre V1
- Génération de la structure (squelette).
- Remplissage automatique des lettres (Solution).
- Support de mots prioritaires définis par l'utilisateur.
- Interface moderne et responsive.

## 🛠 Stack Technique

- **Framework** : [Next.js 14+ (App Router)](https://nextjs.org/)
- **Langage** : [TypeScript](https://www.typescriptlang.org/)
- **Styling** : [Tailwind CSS](https://tailwindcss.com/)
- **Validation** : [Zod](https://zod.dev/)
- **Formulaires** : [React Hook Form](https://react-hook-form.com/)
- **Algorithmes** : CSP (Constraint Satisfaction Problem) avec Backtracking et heuristique MRV.

## 📂 Architecture du Projet

```text
src/
├── app/              # Routes et API handlers
├── components/       # Composants React (Grid, UI, WordList)
├── data/             # Dictionnaires et ressources statiques
├── lib/
│   ├── solver/       # Moteur de résolution algorithmique
│   ├── dictionary/   # Gestion et filtrage du lexique
│   └── types.ts      # Définitions TypeScript globales
└── utils/            # Utilitaires helpers
```

## ⚙️ Installation et Développement

### Pré-requis
- Node.js 18+
- pnpm (recommandé) ou npm/yarn

### Installation
```bash
# Installation des dépendances
pnpm install
```

### Lancement en local
```bash
pnpm dev
```
L'application sera accessible sur `http://localhost:3000`.

### Build pour la production
```bash
pnpm build
pnpm start
```

## 🧠 Algorithme de Génération

Le solver fonctionne en trois phases distinctes :
1. **Placement Squelette** : Disposition des mots prioritaires de l'utilisateur.
2. **Génération du Motif** : Placement stratégique des cases noires (symétrie, connectivité).
3. **Remplissage CSP** : Utilisation d'un algorithme de backtracking optimisé pour remplir les cases vides restantes avec des mots du dictionnaire.

## 📝 Licence

Ce projet est sous licence MIT.
