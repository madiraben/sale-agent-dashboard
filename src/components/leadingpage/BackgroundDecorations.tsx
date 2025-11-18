export function BackgroundDecorations() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-cyan-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
      <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-br from-cyan-100/20 to-purple-100/20 rounded-full blur-3xl"></div>
    </div>
  );
}

