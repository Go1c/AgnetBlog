export const metadata = {
  title: 'Admin Content',
};

export default function AdminContentPage() {
  return (
    <section className="rounded-lg border border-stone-900/10 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-stone-950">Content</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-700">
        This page will show synced Markdown and MDX entries, publication state,
        visibility, source path, and validation issues after the content pipeline
        and database branches merge.
      </p>
    </section>
  );
}
