# Deployment Workflow (Local → Testing → Production)

Your site is **live with real users**. This guide keeps updates safe by using three stages.

---

## The three stages

| Stage | What it is | When you use it |
|-------|------------|------------------|
| **Local** | The app running on your computer only. No one else sees it. | When you edit code and want to see changes immediately. |
| **Testing** | A temporary public URL from Vercel. Looks like the real site but is a copy for trying things. | When you want to check your changes on a real link (e.g. on your phone) before they go live. |
| **Production** | The real, live site your users use. | Only after you’re happy with Testing. |

---

## Safe workflow for small updates

1. **Never edit directly on `main`.**  
   `main` = Production. Keep it clean.

2. **Create a branch for your update** (one goal per branch):
   ```bash
   git checkout main
   git pull
   git checkout -b fix-typo-homepage
   ```
   (Use a short name like `fix-typo-homepage` or `update-pricing-text`.)

3. **Work locally**
   - Edit your files in Cursor.
   - Run the app locally: `npm run dev`
   - Check everything on your machine.

4. **Send your branch to Testing**
   - Commit and push your branch:
     ```bash
     git add .
     git commit -m "Fix typo on homepage"
     git push -u origin fix-typo-homepage
     ```
   - If Git is connected to Vercel, Vercel will build your branch and give you a **Preview (Testing) URL** (e.g. in the PR or in the Vercel dashboard).
   - Open that URL and confirm everything looks good. No one else uses this URL unless you share it.

5. **Only then update Production**
   - When Testing looks good, merge your branch into `main` (e.g. via GitHub Pull Request, or locally):
     ```bash
     git checkout main
     git merge fix-typo-homepage
     git push origin main
     ```
   - Vercel will deploy `main` to **Production**. That’s when your users see the change.

---

## One-line summary

**Local (your PC) → branch → push = Testing URL → check it → merge to `main` = Production.**

---

## Vercel setup to make this work

- **Production**: Deploy from branch `main` (so only `main` updates the live site).
- **Preview (Testing)**: Every other branch gets its own Preview URL when you push.

In Vercel: **Project → Settings → Git**:

- Connect your repo if you haven’t.
- Set **Production Branch** to `main`.
- Leave **Preview** enabled for other branches.

---

## If something goes wrong

- **Production is broken after a merge:** In Vercel dashboard you can **roll back** to the previous deployment (Deployments → … on last good one → Promote to Production).
- **Testing looks wrong:** Don’t merge. Fix on the same branch, push again, check the new Preview URL.

---

*You’re on `main` by default. For any update, switch to a new branch first, then follow the steps above.*
