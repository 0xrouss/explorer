interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-32 w-32",
  };

  return (
    <div className="flex items-center justify-center">
      <div className="text-center">
        <div
          className={`animate-spin rounded-full border-b-2 border-blue-500 mx-auto ${sizeClasses[size]}`}
        ></div>
        {text && <p className="mt-4 text-gray-600">{text}</p>}
      </div>
    </div>
  );
}
