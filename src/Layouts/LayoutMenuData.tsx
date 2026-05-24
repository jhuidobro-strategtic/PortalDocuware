const Navdata = (t: (key: string) => string) => [
    {
        label: t("Menu"),
        isHeader: true,
    },
    {
        id: "document-management",
        label: t("Document management"),
        icon: "ri-file-list-3-line",
        subItems: [
            {
                id: "documents",
                label: t("Documents"),
                link: "/documents",
            },
            {
                id: "document-details",
                label: t("Document Details"),
                link: "/document-details",
            },
            {
                id: "document-programation",
                label: t("Programming"),
                link: "/document-programation",
            },
        ],
    },
    {
        id: "purchase-orders",
        label: t("Purchase Orders"),
        icon: "ri-shopping-bag-3-line",
        subItems: [
            {
                id: "purchase-order-details",
                label: t("Purchase Order Details"),
                link: "/purchase-order-details",
            },
        ],
    },
    {
        id: "suppliers",
        label: t("Suppliers"),
        icon: "ri-store-2-line",
        subItems: [
            {
                id: "supplier-list",
                label: t("Supplier List"),
                link: "/suppliers",
            },
        ],
    },
    {
        id: "expedients",
        label: t("Expedients"),
        icon: "ri-folder-2-line",
        subItems: [
            {
                id: "expedient-list",
                label: t("Expedient List"),
                link: "/expedientes",
            },
        ],
    },
    {
        id: "travel-expenses",
        label: t("Travel Expenses"),
        icon: "ri-road-map-line",
        subItems: [
            {
                id: "travel-expenses-trips",
                label: t("Trips"),
                link: "/travel-expenses/trips",
            },
            {
                id: "travel-expenses-requests",
                label: t("Requests"),
                link: "/travel-expenses/requests",
            },
            {
                id: "travel-expenses-my-schedule",
                label: t("My Schedule"),
                link: "/travel-expenses/my-schedule",
            },
            {
                id: "travel-expenses-reports",
                label: t("Reports"),
                link: "/travel-expenses/reports",
            },
        ],
    },
    {
        id: "user-management",
        label: t("User Management"),
        icon: "ri-user-settings-line",
        subItems: [
            {
                id: "user-list",
                label: t("Users"),
                link: "/users",
            },
        ],
    },
];

export default Navdata;
