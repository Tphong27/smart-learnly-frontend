import { useCallback, useEffect, useState } from "react";
import { userService } from "@/services";

function fetchActiveTrainers() {
  return userService.listActiveTrainers({
    page: 0,
    size: 100,
  });
}

function normalizeTrainers(data) {
  return Array.isArray(data?.content) ? data.content : [];
}

export function useActiveTrainers({ autoLoad = true } = {}) {
  const [trainers, setTrainers] = useState([]);
  const [loadingTrainers, setLoadingTrainers] = useState(autoLoad);
  const [trainerError, setTrainerError] = useState("");

  useEffect(() => {
    if (!autoLoad) {
      return undefined;
    }

    let cancelled = false;

    fetchActiveTrainers()
      .then((data) => {
        if (cancelled) return;

        setTrainers(normalizeTrainers(data));
        setTrainerError("");
        setLoadingTrainers(false);
      })
      .catch((error) => {
        if (cancelled) return;

        console.error("Error loading active trainers:", error);

        setTrainers([]);
        setTrainerError(error?.message || "Can not load active trainers");
        setLoadingTrainers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [autoLoad]);

  const reloadTrainers = useCallback(async () => {
    setLoadingTrainers(true);
    setTrainerError("");

    try {
      const data = await fetchActiveTrainers();
      setTrainers(normalizeTrainers(data));
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