import LoadingScreen from "@/components/loading-screen";

export default function Loading() {
  return (
    <LoadingScreen
      message="Loading login..."
      logoSrc="/images/logo/logo.png"
      backgroundClassName="bg-gradient-to-br from-cyan-50 to-purple-50"
      dotClassName="bg-gradient-to-r from-cyan-500 to-purple-600"
    />
  );
}


