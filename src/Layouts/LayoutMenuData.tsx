const Navdata = () => [
    {
        label: "Menu",
        isHeader: true,
    },
    {
        id: "document-management",
        label: "Document management",
        icon: "ri-file-list-3-line",
        subItems: [
            {
                id: "documents",
                label: "Documents",
                link: "/documents",
            },
            {
                id: "document-details",
                label: "Document Details",
                link: "/document-details",
            },
            {
                id: "document-programation",
                label: "Programming",
                link: "/document-programation",
            },
        ],
    },
    {
        id: "purchase-orders",
        label: "Ordenes de Compra",
        icon: "ri-shopping-bag-3-line",
        subItems: [
            {
                id: "purchase-order-details",
                label: "Detalle de Orden de Compra",
                link: "/purchase-order-details",
            },
        ],
    },
];

export default Navdata;
