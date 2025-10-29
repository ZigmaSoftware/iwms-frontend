import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import Input from "../../components/form/input/InputField";
import ComponentCard from "../../components/common/ComponentCard";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";

export default function UserCreationForm() {
  const [userTypes, setUserTypes] = useState<{ value: string; label: string }[]>([]);
  const [userType, setUserType] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [lastName, setLastName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  //  Fetch UserTypes from backend
  useEffect(() => {
    api
      .get("user-type/")
      .then((res) => {
        const activeTypes = res.data
          .filter((t: any) => t.is_active)
          .map((t: any) => ({
            value: t.id.toString(),
            label: t.name,
          }));
        setUserTypes(activeTypes);
        console.log("Fetched user types:", activeTypes);
      })
      .catch((err) => console.error("Error fetching user types:", err));
  }, []);

  // Fetch existing user details if editing
  useEffect(() => {
    if (isEdit) {
      api
        .get(`user/${id}/`)
        .then((res) => {
          const u = res.data;
          setUserType(u.user_type?.toString() || "");
          setUsername(u.username);
          setFirstName(u.first_name);
          setPassword(u.password);
          setLastName(u.last_name);
          setIsActive(u.is_active);
          setEmail(u.email || "");
        })
        .catch((err) => {
          console.error("Error fetching user:", err);
          Swal.fire({
            icon: "error",
            title: "Failed to load user",
          });
        });
    }
  }, [id, isEdit]);

  //  Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userType || !username || (!isEdit && !password) || !firstName) {
      Swal.fire({
        icon: "warning",
        title: "Please fill in all required fields!",
      });
      return;
    }

    const payload = {
     user_type: Number(userType),

      username,
      password,
      first_name: firstName,
      last_name: lastName,
      is_active: isActive,
      is_delete: false,
      email: email,
    };

    try {
      setLoading(true);
      if (isEdit) {
        await api.put(`user/${id}/`, payload);
        Swal.fire({
          icon: "success",
          title: "User updated successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await api.post("user/", payload);
        Swal.fire({
          icon: "success",
          title: "User created successfully!",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      navigate("/user-creation");
    } catch (error: any) {
      console.error("Save failed:", error);
      Swal.fire({
        icon: "error",
        title: "Save failed",
        text: error.response?.data?.detail || "Something went wrong!",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ComponentCard title={isEdit ? "Edit User" : "Add User"}>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/*  User Type Dropdown */}
          <div>
            <Label htmlFor="userType">
              User Type <span className="text-red-500">*</span>
            </Label>
            <Select
              id="userType"
              required
              value={userType}
              onChange={(val) => setUserType(val)}
              options={userTypes}
              className="input-validate w-full"
              // placeholder="Select user type"
            />
          </div>

          {/*  Username */}
          <div>
            <Label htmlFor="username">
              Username <span className="text-red-500">*</span>
            </Label>
            <Input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="input-validate w-full"
            />
          </div>

          {/*  Password */}
          <div>
            <Label htmlFor="password">
              {isEdit ? "Password" : "Password"}{" "}
              {!isEdit && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="input-validate w-full"
            />
          </div>

          {/*  First Name */}
          <div>
            <Label htmlFor="firstName">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter first name"
              className="input-validate w-full"
            />
          </div>

          {/*  Last Name */}
          <div>
             <Label htmlFor="lastName">
            Last Name <span className="text-red-500">*</span></Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              required
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter last name"
              className="input-validate w-full"
            />
          </div>
          <div>
          {/*  Email */}
             <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              required
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email"
              className="input-validate w-full"
            /> 

            </div>


          {/*  Active Status */}
          <div>
            <label htmlFor="isActive">
              Active Status <span className="text-red-500">*</span>
            </label>
            {/* <Select
              id="isActive"
              required
              value={isActive ? "true" : "false"}
              onChange={(val) => setIsActive(val === "true")}
              options={[
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ]}
              className="input-validate w-full"
            /> */}
             <select
                value={isActive ? "Active" : "Inactive"}
                onChange={(e) => setIsActive(e.target.value === "Active")}
                className="w-full px-3 py-2 border border-green-400 rounded-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
          </div>
        </div>

        {/* 🧾 Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-custom text-white px-4 py-2 rounded disabled:opacity-50 transition-colors"
          >
            {loading
              ? isEdit
                ? "Updating..."
                : "Saving..."
              : isEdit
              ? "Update"
              : "Save"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/user-creation")}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </ComponentCard>
  );
}
