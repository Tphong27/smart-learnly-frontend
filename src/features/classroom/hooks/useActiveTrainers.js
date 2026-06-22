import { useEffect, useState } from "react";
import { userService } from "@/services";

export function useActiveTrainers({ enabled = true } = {}) {
  const [trainers, setTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(true);
  const [trainerError, setTrainerError] = useState("");

  useEffect(() => {
    if (!enabled) {
      setLoadingTrainers(false);
      return undefined;
    }

    let mounted = true;

    async function fetchActiveTrainers() {
      try {
        setLoadingTrainers(true);
        setTrainerError("");

        const data = await userService.listActiveTrainers({
          page: 0,
          size: 100,
        });

        if (mounted) {
          setTrainers(Array.isArray(data?.content) ? data.content : []);
        }
      } catch (error) {
        console.error("Error loading trainers:", error);

        if (mounted) {
          setTrainers([]);
          setTrainerError(error.message || "Can not load active trainers");
        }
      } finally {
        if (mounted) {
          setLoadingTrainers(false);
        }
      }
    }

    fetchActiveTrainers();

    return () => {
      mounted = false;
    };
  }, [enabled]);

  return {
    trainers,
    loadingTrainers,
    trainerError,
  };
}