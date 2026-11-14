function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Etapa 0 · Base del proyecto
      </span>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Inventario de almacén 3D
      </h1>
      <p className="max-w-md text-muted-foreground">
        Proyecto base con Vite, React, TypeScript, Tailwind CSS, React Three
        Fiber, Zustand y TanStack Query. Listo para empezar a construir el
        armador de pallets.
      </p>
      <button
        type="button"
        className="rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground transition hover:brightness-110"
      >
        Todo funciona
      </button>
    </div>
  )
}

export default App
