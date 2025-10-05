import React, { memo } from "react";
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

const PredictionDisplay: React.FC<PredictionDisplayProps> = memo(
  ({ prediction, isProcessing, isBackendAvailable, className = "" }) => {
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
        <Card
          className={`bg-white border border-gray-200 shadow-sm rounded-lg w-full ${className}`}
        >
          <CardHeader>
            <CardTitle
              className="flex items-center gap-2 text-xl font-semibold text-gray-900"
              style={{
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              <XCircle className="h-5 w-5 text-red-500" />
              ASL Letter Prediction
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Backend server is not available. Please make sure the server is
                running on localhost:8000.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card
        className={`bg-white border border-gray-200 shadow-sm rounded-lg w-full ${className}`}
      >
        <CardHeader>
          <CardTitle
            className="flex items-center gap-2 text-xl font-semibold text-gray-900"
            style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
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
                <p
                  className="text-sm text-gray-600"
                  style={{
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
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
                    <div
                      className="text-6xl font-bold text-gray-900 mb-2"
                      style={{
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {prediction.predicted_letter}
                    </div>
                    <p
                      className="text-sm text-gray-600"
                      style={{
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
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
                      <p
                        className="text-xs text-gray-500 mt-1"
                        style={{
                          fontFamily: "system-ui, -apple-system, sans-serif",
                        }}
                      >
                        {(prediction.confidence * 100).toFixed(1)}%
                      </p>
                    </div>

                    <div className="text-center">
                      <Badge
                        variant="outline"
                        className="border-gray-300 text-gray-700"
                      >
                        Distance: {prediction.distance.toFixed(1)}
                      </Badge>
                      <p
                        className="text-xs text-gray-500 mt-1"
                        style={{
                          fontFamily: "system-ui, -apple-system, sans-serif",
                        }}
                      >
                        Lower is better
                      </p>
                    </div>
                  </div>

                  {/* Hand Information */}
                  <div className="text-center">
                    <Badge
                      variant="secondary"
                      className="bg-gray-100 text-gray-800"
                    >
                      {prediction.hand_label} Hand
                    </Badge>
                  </div>

                  {/* Status Message */}
                  <div className="text-center">
                    <p
                      className="text-sm text-green-600"
                      style={{
                        fontFamily: "system-ui, -apple-system, sans-serif",
                      }}
                    >
                      {prediction.message}
                    </p>
                  </div>
                </>
              ) : (
                <Alert className="border-orange-200 bg-orange-50">
                  <XCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    {prediction.message}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p
                className="text-sm text-gray-600"
                style={{
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                Show your hand to the camera to predict ASL letters
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

PredictionDisplay.displayName = "PredictionDisplay";

export default PredictionDisplay;
