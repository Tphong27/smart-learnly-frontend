import { useCallback, useState } from "react";
import { userService } from "@/services";

export function useActiveTrainers() {
  const [trainers, setTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(false);
  const [trainerError, setTrainerError] = useState("");

  const reloadTrainers = useCallback(async () => {
    try {
      setLoadingTrainers(true);
      setTrainerError("");

      const data = await userService.listActiveTrainers({
        page: 0,
        size: 100,
      });

      setTrainers(Array.isArray(data?.content) ? data.content : []);
    } catch (error) {
      console.error("Error loading active trainers:", error);

      setTrainers([]);
      setTrainerError(error?.message || "Can not load active trainers");
    } finally {
      setLoadingTrainers(false);
    }
  }, []);

  return {
    trainers,
    loadingTrainers,
    trainerError,
    reloadTrainers,
  };
}