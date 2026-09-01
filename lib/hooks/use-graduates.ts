import { graduatesApi } from "@/lib/api/graduates";
import { PaginationParams } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";

export function useGraduates(
  params?: PaginationParams & {
    academicYearId?: string;
    search?: string;
  },
) {
  return useQuery({
    queryKey: ["graduates", params],
    queryFn: async () => {
      const result = await graduatesApi.getAll(params);
      return {
        data: result.students || [],
        pagination: result.pagination,
      };
    },
  });
}
