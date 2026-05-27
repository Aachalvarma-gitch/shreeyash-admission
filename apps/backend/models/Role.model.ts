import mongoose, { Schema } from 'mongoose';
const permissionSchema = new Schema({
    resource: {
        type: String,
        required: true,
        enum: [
            'users', 'roles',

        ],
    },
    actions: [{
        type: String,
        enum: ['create', 'read', 'update', 'delete', 'export'],
    }],
}, { _id: false });
const roleSchema = new Schema({
    name: {
        type: String,
        required: [true, 'Role name is required'],
        unique: true,
        trim: true,
        enum: [
            'Super Admin',
            'Admin',
            'Student'
        ],
    },
    description: {
        type: String,
        trim: true,
    },
    permissions: [permissionSchema],
    isActive: {
        type: Boolean,
        default: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
// Index
roleSchema.index({ name: 1, isDeleted: 1 }, { unique: true });
const Role = mongoose.model('Role', roleSchema);
export default Role;
//# sourceMappingURL=Role.model.js.map