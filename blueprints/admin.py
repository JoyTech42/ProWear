from flask import Blueprint, render_template, abort, request, redirect, url_for, flash
from flask_login import login_required, current_user
from app import db, Product, ContactMessage

admin_bp = Blueprint('admin', __name__)

@admin_bp.before_request
@login_required
def restrict_to_admins():
    if current_user.role not in ['admin', 'staff']:
        abort(403)

@admin_bp.route('/dashboard')
def dashboard():
    total_products = Product.query.count()
    total_messages = ContactMessage.query.count()
    recent_messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).limit(5).all()
    return render_template('admin/dashboard.html', products_count=total_products, messages_count=total_messages, messages=recent_messages)

@admin_bp.route('/product/add', methods=['POST'])
def add_product():
    name = request.form.get('name')
    sku = request.form.get('sku')
    price = request.form.get('price')
    category = request.form.get('category')
    stock = request.form.get('stock', 0)
    
    new_product = Product(name=name, sku=sku, price=price, category=category, stock=stock)
    db.session.add(new_product)
    db.session.commit()
    flash('Product added cleanly into inventory catalog.', 'success')
    return redirect(url_for('admin.dashboard'))
