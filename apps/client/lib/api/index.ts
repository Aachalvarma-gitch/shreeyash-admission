export {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useSendOTPMutation,
  useVerifyOTPMutation,
  useRefreshTokenMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutMutation,
} from "./auth.api";

export {
  useGetPublicCategoriesQuery,
  useGetPublicCoursesQuery,
  useGetCategoriesQuery,
  useGetCoursesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
} from "./course.api";

export {
  useGetCategoriesQuery as useStudentCategoriesQuery,
  useGetCoursesQuery as useStudentCoursesQuery,
  useGetProfileQuery as useStudentProfileQuery,
  useUpdateProfileMutation as useStudentUpdateProfileMutation,
  useCreateApplicationMutation,
  useGetMyApplicationQuery,
  useUpdateApplicationMutation,
} from "./student.api";

export {
  useGetStatsQuery as useAdminGetStatsQuery,
  useGetApplicationsQuery as useAdminGetApplicationsQuery,
  useGetApplicationByIdQuery as useAdminGetApplicationByIdQuery,
  useUploadDocumentMutation as useAdminUploadDocumentMutation,
  useUpdateApplicationStatusMutation as useAdminUpdateApplicationStatusMutation,
  useBulkUpdateStatusMutation as useAdminBulkUpdateStatusMutation,
  useGetStudentsQuery as useAdminGetStudentsQuery,
  useGetInquiriesQuery as useAdminGetInquiriesQuery,
  useUpdateInquiryMutation as useAdminUpdateInquiryMutation,
  useGetUsersQuery as useAdminGetUsersQuery,
  useCreateUserMutation as useAdminCreateUserMutation,
  useDeleteUserMutation as useAdminDeleteUserMutation,
  useToggleUserBlockMutation as useAdminToggleUserBlockMutation,
  useGetAuditLogsQuery as useAdminGetAuditLogsQuery,
  useExportApplicationsQuery as useAdminExportApplicationsQuery,
  useExportInquiriesQuery as useAdminExportInquiriesQuery,
  useGetProfileQuery as useAdminGetProfileQuery,
  useUpdateProfileMutation as useAdminUpdateProfileMutation,
  useChangePasswordMutation as useAdminChangePasswordMutation,
  useSeedDataMutation as useAdminSeedDataMutation,
} from "./admin.api";

export {
  useGetStatsQuery as useSuperAdminGetStatsQuery,
  useGetAdminsQuery as useSuperAdminGetAdminsQuery,
  useCreateAdminMutation as useSuperAdminCreateAdminMutation,
  useUpdateAdminMutation as useSuperAdminUpdateAdminMutation,
  useDeleteAdminMutation as useSuperAdminDeleteAdminMutation,
  useGetCoursesQuery as useSuperAdminGetCoursesQuery,
  useCreateCourseMutation as useSuperAdminCreateCourseMutation,
  useUpdateCourseMutation as useSuperAdminUpdateCourseMutation,
  useDeleteCourseMutation as useSuperAdminDeleteCourseMutation,
  useGetInquiriesQuery as useSuperAdminGetInquiriesQuery,
  useUpdateInquiryMutation as useSuperAdminUpdateInquiryMutation,
  useGetAuditLogsQuery as useSuperAdminGetAuditLogsQuery,
  useSeedDataMutation as useSuperAdminSeedDataMutation,
} from "./superadmin.api";

export { axiosBaseQuery, setTokens, getAccessToken, getRefreshToken, clearTokens, axios } from "./baseQuery";