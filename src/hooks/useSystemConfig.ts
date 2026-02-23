import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SystemConfigService } from "@/src/lib/firebase/system-config-service";
import { SystemConfig } from "@/src/lib/types";

export const SYSTEM_CONFIG_QUERY_KEY = ["systemConfig"];

export function useSystemConfig() {
    const queryClient = useQueryClient();

    // Fetch config
    const {
        data: config,
        isLoading,
        error: fetchError,
    } = useQuery({
        queryKey: SYSTEM_CONFIG_QUERY_KEY,
        queryFn: async () => {
            const result = await SystemConfigService.getConfig();
            return result;
        },
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    // Update config
    const mutation = useMutation({
        mutationFn: async (updatedConfig: Partial<SystemConfig>) => {
            await SystemConfigService.updateConfig(updatedConfig);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SYSTEM_CONFIG_QUERY_KEY });
        },
    });

    return {
        config,
        isLoading,
        error: fetchError || mutation.error,
        updateConfig: mutation.mutate,
        updateConfigAsync: mutation.mutateAsync,
        isUpdating: mutation.isPending,
    };
}
