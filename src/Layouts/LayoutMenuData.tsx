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
];

export default Navdata;
