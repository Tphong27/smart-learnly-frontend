import { useLocation, Link } from "react-router-dom";
import "./Breadcrumb.css";

const Breadcrumb = ({ customLabels = {} }) => {
    const location = useLocation();
    const pathnames = location.pathname.split("/").filter((x) => x);

    // Bản đồ dịch nhanh các từ khóa hệ thống sang tiếng Anh chuẩn UI
    const defaultLabels = {
        admin: "Admin",
        courses: "Courses",
        analytics: "Analytics",
        users: "Users",
        create: "Create New",
        edit: "Edit Profile",
        ...customLabels,
    };

    if (pathnames.length === 0) return null;

    return (
        <nav className="modern-breadcrumb" aria-label="breadcrumb">
            <ol className="breadcrumb-list">
                <li className="breadcrumb-item">
                    <Link to="/admin">Dashboard</Link>
                </li>
                {pathnames.map((value, index) => {
                    const last = index === pathnames.length - 1;
                    const to = `/${pathnames.slice(0, index + 1).join("/")}`;
                    const label = defaultLabels[value.toLowerCase()] || value;

                    return last ? (
                        <li
                            key={to}
                            className="breadcrumb-item active"
                            aria-current="page"
                        >
                            {label}
                        </li>
                    ) : (
                        <li key={to} className="breadcrumb-item">
                            <Link to={to}>{label}</Link>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default Breadcrumb;
