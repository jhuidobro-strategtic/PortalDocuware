import { canVisit } from "../helpers/portal-access";

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
        label: t("Order Generation"),
        icon: "ri-shopping-bag-3-line",
        subItems: [
            {
                id: "purchase-order-details",
                label: t("Order Generation"),
                link: "/purchase-order-details",
            },
        ],
    },
    {
        id: "pre-orders",
        label: "Pre-Órdenes",
        icon: "ri-file-list-2-line",
        subItems: [{ id: "pre-orders-list", label: "Pre-Órdenes", link: "/pre-orders" }],
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
            { id: "supplier-credit-list", label: "Saldos a favor", link: "/supplier-credits" },
            { id: "direct-expedient-inbox", label: "Envíos sin OC/OS", link: "/expedientes/sin-orden" },
        ],
    },
    {
        id: "vehicle-management",
        label: "Gestor Vehicular",
        icon: "ri-truck-line",
        subItems: [{ id: "vehicle-list", label: "Vehículos", link: "/gestor-vehicular" }],
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
                id: "travel-expenses-anticipos",
                label: t("Anticipos"),
                link: "/travel-expenses/anticipos",
            },
            {
                id: "travel-expenses-my-schedule",
                label: t("My Schedule"),
                link: "/travel-expenses/my-schedule",
            },
            {
                id: "travel-expenses-reports",
                label: t("Reporte de Rendiciones"),
                link: "/reports/rendiciones",
            },
        ],
    },
    {
        id: "folders",
        label: t("Procesamiento de Archivos"),
        icon: "ri-folder-2-line",
        subItems: [
            {
                id: "procesamiento-archivos-list",
                label: t("Archivos"),
                link: "/procesamiento-archivos",
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
            { id: "roles", label: "Roles y permisos", link: "/users/roles" },
            { id: "document-order", label: "Orden documental", link: "/users/document-order" },
        ],
    },
].map((item) => item.subItems ? {
    ...item, subItems: item.subItems.filter((child) => canVisit(child.link)),
} : item).filter((item) => !item.subItems || item.subItems.length > 0);

export default Navdata;
