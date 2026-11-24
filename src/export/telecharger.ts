/** Déclenche le téléchargement d'un fichier produit dans le navigateur. */
export function telecharger(nom: string, contenu: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
