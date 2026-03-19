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
];

export default Navdata;
