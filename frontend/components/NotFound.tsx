interface NotFoundProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function NotFound({
  title = "Not Found",
  message = "The requested resource could not be found.",
  showBackButton = true,
  onBack,
}: NotFoundProps) {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
        <p className="text-gray-600 mb-4">{message}</p>
        {showBackButton && (
          <button
            onClick={handleBack}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
}
