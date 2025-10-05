import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { PredictionResponse } from "../lib/prediction-service";

interface PredictionDisplayProps {
  prediction: PredictionResponse | null;
  isProcessing: boolean;
  isBackendAvailable: boolean;
  className?: string;
}

const PredictionDisplay: React.FC<PredictionDisplayProps> = ({
  prediction,
  isProcessing,
  isBackendAvailable,
  className = "",
}) => {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.6) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    return "Low";
  };

  if (!isBackendAvailable) {
    return (
      <Card className={`w-full ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            ASL Letter Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Backend server is not available. Please make sure the server is
              running on localhost:8000.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
          ) : prediction?.success ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-500" />
          )}
          ASL Letter Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isProcessing ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Analyzing hand landmarks...
              </p>
            </div>
          </div>
        ) : prediction ? (
          <div className="space-y-4">
            {prediction.success ? (
              <>
                {/* Predicted Letter */}
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-2">
                    {prediction.predicted_letter}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Predicted Letter
                  </p>
                </div>

                {/* Confidence and Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <Badge
                      className={`${getConfidenceColor(
                        prediction.confidence
                      )} text-white`}
                      variant="secondary"
                    >
                      {getConfidenceText(prediction.confidence)} Confidence
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(prediction.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="text-center">
                    <Badge variant="outline">
                      Distance: {prediction.distance.toFixed(1)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Lower is better
                    </p>
                  </div>
                </div>

                {/* Hand Information */}
                <div className="text-center">
                  <Badge variant="secondary">
                    {prediction.hand_label} Hand
                  </Badge>
                </div>

                {/* Status Message */}
                <div className="text-center">
                  <p className="text-sm text-green-600">{prediction.message}</p>
                </div>
              </>
            ) : (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>{prediction.message}</AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Show your hand to the camera to predict ASL letters
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictionDisplay;
